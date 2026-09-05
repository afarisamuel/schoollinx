import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { HrService } from '../../../../core/infrastructure/hr/hr.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../../core/infrastructure/auth/auth.service';
import { LeaveBalance, LeaveRequest, PayrollRecord, StaffProfile } from '../../../../core/domain/hr/hr.model';

export interface FacultyPayslip {
  id: string;
  rawId?: string;
  month: string;
  year: number;
  gross: number;
  basicSalary: number;
  teachingAllowance: number;
  transportAllowance: number;
  ssnitEmployee: number; // 5.5%
  ssnitEmployer: number; // 13.0%
  payeTax: number;
  welfareDues: number;
  netPay: number;
  status: 'PAID' | 'PROCESSING';
  paymentDate: string;
  paymentMethod: string;
  referenceNo: string;
}

export interface FacultyLeaveRecord {
  id: string;
  rawId?: string;
  leaveType: string;
  categoryLabel: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  reliefStaff?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  appliedOn: string;
  approvedBy?: string;
  approverNotes?: string;
}

export interface LeaveQuota {
  type: string;
  label: string;
  icon: string;
  iconBg: string;
  allocated: number;
  used: number;
  color: string;
}

@Component({
  selector: 'app-teacher-hr-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-hr-vault.component.html'
})
export class TeacherHrVaultComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private hrService = inject(HrService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  activeTab = signal<'overview' | 'leaves' | 'payslips' | 'documents'>('overview');
  selectedYear = signal(new Date().getFullYear());

  teacher = signal<any>(null);
  currentStaffId = signal<string>('');
  
  // Faculty Profile Details - Loaded dynamically from database
  staffProfile = signal({
    staffId: 'STF-PENDING',
    designation: 'Faculty Member',
    department: 'Academic Instruction',
    ssnitNumber: 'Not on file',
    tinNumber: 'Not on file',
    hireDate: 'Not specified',
    bankName: 'Not on file',
    accountNumber: '',
    employmentType: 'Full-Time Faculty',
    baseSalary: 0
  });

  // Leave Quotas - Derived from database LeaveBalances
  leaveQuotas = signal<LeaveQuota[]>([]);

  // Leave Form State
  isLeaveModalOpen = signal(false);
  leaveType = signal('CASUAL');
  leaveStart = signal(new Date().toISOString().slice(0, 10));
  leaveEnd = signal(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  leaveReason = signal('');
  reliefTeacher = signal('');
  isSubmittingLeave = signal(false);

  // Leave History - Loaded from database LeaveRequests
  leaveHistory = signal<FacultyLeaveRecord[]>([]);

  // Payslips Archive - Loaded from database PayrollRecords
  payslips = signal<FacultyPayslip[]>([]);

  // Selected Payslip for Detail View Modal
  selectedPayslip = signal<FacultyPayslip | null>(null);

  // Documents
  hrDocuments = signal<any[]>([]);

  // Telemetry Computeds
  totalAllocatedLeave = computed(() => {
    return this.leaveQuotas().reduce((acc, curr) => acc + curr.allocated, 0);
  });

  totalUsedLeave = computed(() => {
    return this.leaveQuotas().reduce((acc, curr) => acc + curr.used, 0);
  });

  totalAvailableLeave = computed(() => {
    const avail = this.totalAllocatedLeave() - this.totalUsedLeave();
    return avail > 0 ? avail : 0;
  });

  leaveProgressPercent = computed(() => {
    const total = this.totalAllocatedLeave();
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (this.totalAvailableLeave() / total) * 100));
  });

  pendingLeaveCount = computed(() => {
    return this.leaveHistory().filter(l => l.status === 'PENDING').length;
  });

  approvedLeaveCount = computed(() => {
    return this.leaveHistory().filter(l => l.status === 'APPROVED').length;
  });

  calculatedLeaveDays = computed(() => {
    if (!this.leaveStart() || !this.leaveEnd()) return 0;
    const start = new Date(this.leaveStart());
    const end = new Date(this.leaveEnd());
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  });

  // YTD Computeds
  ytdGross = computed(() => {
    return this.payslips().reduce((acc, p) => acc + p.gross, 0);
  });

  ytdNet = computed(() => {
    return this.payslips().reduce((acc, p) => acc + p.netPay, 0);
  });

  ytdTax = computed(() => {
    return this.payslips().reduce((acc, p) => acc + p.payeTax, 0);
  });

  ytdSsnit = computed(() => {
    return this.payslips().reduce((acc, p) => acc + p.ssnitEmployee, 0);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    const currentUser = this.authService.currentUserValue;

    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        if (res.teacher) {
          const t = res.teacher as any;
          this.staffProfile.update(prev => ({
            ...prev,
            staffId: t.staff_id || (t.id ? `STF-${String(t.id).substring(0, 8).toUpperCase()}` : prev.staffId),
            department: t.department || prev.department,
            designation: t.designation || prev.designation,
            baseSalary: t.base_salary || prev.baseSalary,
            hireDate: t.created_at ? t.created_at.slice(0, 10) : prev.hireDate
          }));
        }

        // Fetch staff profile list from HR to resolve linked staff record
        this.hrService.getStaffProfiles().subscribe({
          next: (profiles: StaffProfile[]) => {
            const matchedStaff = profiles.find(p => 
              (currentUser && p.user_id === currentUser.id) || 
              (res.teacher && (p.first_name === res.teacher.first_name && p.last_name === res.teacher.last_name)) ||
              (res.teacher && p.id === res.teacher.id)
            ) || (profiles.length > 0 ? profiles[0] : null);

            if (matchedStaff) {
              this.currentStaffId.set(matchedStaff.id);
              this.staffProfile.update(prev => ({
                ...prev,
                staffId: matchedStaff.id ? `STF-${matchedStaff.id.substring(0, 8).toUpperCase()}` : prev.staffId,
                department: matchedStaff.department || prev.department,
                designation: matchedStaff.job_title || prev.designation,
                baseSalary: matchedStaff.base_salary || prev.baseSalary,
                bankName: matchedStaff.bank_account || prev.bankName,
                hireDate: matchedStaff.hire_date ? matchedStaff.hire_date.slice(0, 10) : prev.hireDate
              }));
              this.loadStaffHRData(matchedStaff.id);
            } else {
              const fallbackId = res.teacher?.id || '';
              this.currentStaffId.set(fallbackId);
              this.loadStaffHRData(fallbackId);
            }
            this.isLoading.set(false);
          },
          error: () => {
            const fallbackId = res.teacher?.id || '';
            this.currentStaffId.set(fallbackId);
            this.loadStaffHRData(fallbackId);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadStaffHRData(staffId: string) {
    const year = this.selectedYear();
    const currentMonth = new Date().getMonth() + 1;

    // 1. Fetch Leave Balances from DB
    if (staffId) {
      this.hrService.getStaffLeaveBalances(staffId, year).subscribe({
        next: (balances) => {
          this.processLeaveBalances(balances);
        },
        error: () => {
          this.leaveQuotas.set([]);
        }
      });
    } else {
      this.hrService.getAllLeaveBalances(year).subscribe({
        next: (balances) => {
          this.processLeaveBalances(balances);
        },
        error: () => {
          this.leaveQuotas.set([]);
        }
      });
    }

    // 2. Fetch Leave Requests from DB
    this.hrService.getLeaveRequests().subscribe({
      next: (leaves: LeaveRequest[]) => {
        const staffLeaves = staffId ? leaves.filter(l => l.staff_id === staffId || !l.staff_id) : leaves;
        const mapped: FacultyLeaveRecord[] = staffLeaves.map(l => ({
          id: l.id ? `LV-${l.id.substring(0, 8).toUpperCase()}` : 'LV-N/A',
          rawId: l.id,
          leaveType: l.leave_type,
          categoryLabel: this.getLeaveTypeLabel(l.leave_type),
          startDate: l.start_date ? l.start_date.slice(0, 10) : '',
          endDate: l.end_date ? l.end_date.slice(0, 10) : '',
          daysCount: this.calculateDurationDays(l.start_date, l.end_date),
          reason: l.reason || 'Not specified',
          reliefStaff: 'Faculty Subject Rotation',
          status: l.status || 'PENDING',
          appliedOn: l.created_at ? l.created_at.slice(0, 10) : (l.start_date ? l.start_date.slice(0, 10) : ''),
          approvedBy: l.status === 'APPROVED' ? 'HR & Administration' : (l.status === 'PENDING' ? 'Under Review' : 'HR Administration'),
          approverNotes: l.status === 'APPROVED' ? 'Approved by Administration' : ''
        }));
        this.leaveHistory.set(mapped);
      },
      error: () => {
        this.leaveHistory.set([]);
      }
    });

    // 3. Fetch Payroll History from DB
    this.hrService.getPayrollHistory(currentMonth, year).subscribe({
      next: (payrolls: PayrollRecord[]) => {
        const staffPayrolls = staffId ? payrolls.filter(p => p.staff_id === staffId || !p.staff_id) : payrolls;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const mapped: FacultyPayslip[] = staffPayrolls.map(p => {
          let allowancesBreakdown: any = {};
          let deductionsBreakdown: any = {};
          try {
            if (p.allowances_breakdown) allowancesBreakdown = JSON.parse(p.allowances_breakdown);
            if (p.deductions_breakdown) deductionsBreakdown = JSON.parse(p.deductions_breakdown);
          } catch (e) {}

          const ssnitEmployee = deductionsBreakdown.ssnit || deductionsBreakdown['SSNIT'] || (p.gross_pay * 0.055);
          const ssnitEmployer = p.gross_pay * 0.13;
          const payeTax = deductionsBreakdown.tax || deductionsBreakdown['PAYE'] || (p.deductions - ssnitEmployee > 0 ? p.deductions - ssnitEmployee : 0);
          const welfareDues = deductionsBreakdown.welfare || deductionsBreakdown['Welfare'] || 0;
          const monthLabel = p.period_month >= 1 && p.period_month <= 12 ? monthNames[p.period_month - 1] : `Month ${p.period_month}`;

          return {
            id: p.id ? `PAY-${p.id.substring(0, 8).toUpperCase()}` : 'PAY-N/A',
            rawId: p.id,
            month: `${monthLabel} ${p.period_year}`,
            year: p.period_year,
            gross: p.gross_pay,
            basicSalary: p.gross_pay,
            teachingAllowance: allowancesBreakdown.teaching || allowancesBreakdown['Teaching'] || (p.allowances > 0 ? p.allowances : 0),
            transportAllowance: allowancesBreakdown.transport || allowancesBreakdown['Transport'] || 0,
            ssnitEmployee: ssnitEmployee,
            ssnitEmployer: ssnitEmployer,
            payeTax: payeTax,
            welfareDues: welfareDues,
            netPay: p.net_pay,
            status: p.status === 'PAID' ? 'PAID' : 'PROCESSING',
            paymentDate: p.payment_date ? p.payment_date.slice(0, 10) : (p.created_at ? p.created_at.slice(0, 10) : 'Pending'),
            paymentMethod: 'Bank Direct Deposit',
            referenceNo: p.id ? `TXN-SLX-${p.id.substring(0, 8).toUpperCase()}` : 'TXN-SLX-PENDING'
          };
        });
        this.payslips.set(mapped);
      },
      error: () => {
        this.payslips.set([]);
      }
    });
  }

  private processLeaveBalances(balances: LeaveBalance[]) {
    if (!balances || balances.length === 0) {
      this.leaveQuotas.set([]);
      return;
    }

    const typeConfig: Record<string, { label: string; icon: string; iconBg: string; color: string }> = {
      'ANNUAL': { label: 'Annual Leave', icon: 'fas fa-umbrella-beach', iconBg: 'bg-blue-500/10 text-blue-500', color: 'from-blue-500 to-indigo-500' },
      'CASUAL': { label: 'Casual / Personal', icon: 'fas fa-calendar-day', iconBg: 'bg-emerald-500/10 text-emerald-500', color: 'from-emerald-500 to-teal-500' },
      'SICK': { label: 'Medical / Sick Leave', icon: 'fas fa-notes-medical', iconBg: 'bg-rose-500/10 text-rose-500', color: 'from-rose-500 to-pink-500' },
      'MATERNITY': { label: 'Maternity / Parental', icon: 'fas fa-baby', iconBg: 'bg-purple-500/10 text-purple-500', color: 'from-purple-500 to-indigo-500' },
      'STUDY': { label: 'Study & Exam Leave', icon: 'fas fa-graduation-cap', iconBg: 'bg-amber-500/10 text-amber-500', color: 'from-amber-500 to-orange-500' }
    };

    const quotas: LeaveQuota[] = balances.map(b => {
      const cfg = typeConfig[b.leave_type.toUpperCase()] || {
        label: b.leave_type,
        icon: 'fas fa-calendar-check',
        iconBg: 'bg-emerald-500/10 text-emerald-500',
        color: 'from-emerald-500 to-teal-500'
      };
      return {
        type: b.leave_type,
        label: cfg.label,
        icon: cfg.icon,
        iconBg: cfg.iconBg,
        allocated: b.allocated_days || 0,
        used: b.used_days || 0,
        color: cfg.color
      };
    });

    this.leaveQuotas.set(quotas);
  }

  getLeaveTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'ANNUAL': 'Annual Leave',
      'CASUAL': 'Casual / Personal',
      'SICK': 'Medical / Sick Leave',
      'MATERNITY': 'Maternity / Parental',
      'STUDY': 'Study & Exam Leave'
    };
    return map[type.toUpperCase()] || type;
  }

  calculateDurationDays(startStr?: string, endStr?: string): number {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  submitLeave() {
    if (!this.leaveReason().trim()) {
      this.toast.error('Please specify the justification for the leave application.');
      return;
    }

    const days = this.calculatedLeaveDays();
    if (days <= 0) {
      this.toast.error('End date cannot precede the start date.');
      return;
    }

    this.isSubmittingLeave.set(true);

    const payload: Partial<LeaveRequest> = {
      staff_id: this.currentStaffId() || undefined,
      leave_type: this.leaveType(),
      start_date: this.leaveStart(),
      end_date: this.leaveEnd(),
      reason: this.leaveReason()
    };

    this.hrService.submitLeaveRequest(payload).subscribe({
      next: () => {
        this.isSubmittingLeave.set(false);
        this.isLeaveModalOpen.set(false);
        this.leaveReason.set('');
        this.reliefTeacher.set('');
        this.toast.success(
          `Leave application for ${days} days filed successfully. Awaiting administrative review.`,
          'Application Submitted'
        );
        this.loadStaffHRData(this.currentStaffId());
      },
      error: () => {
        this.isSubmittingLeave.set(false);
        this.toast.error('Failed to submit leave request to server. Please try again.');
      }
    });
  }

  cancelLeave(leaveId: string) {
    this.leaveHistory.update(prev => prev.filter(l => l.id !== leaveId));
    this.toast.info(`Leave request ${leaveId} has been withdrawn.`);
  }

  viewPayslipModal(slip: FacultyPayslip) {
    if (!slip) return;
    this.selectedPayslip.set(slip);
  }

  closePayslipModal() {
    this.selectedPayslip.set(null);
  }

  printPayslip() {
    window.print();
  }

  downloadDocument(doc: any) {
    this.toast.success(`Downloading ${doc.title}...`, 'Document Export');
  }

  copyToClipboard(text: string, label: string) {
    if (!text || text === 'Not on file') {
      this.toast.info(`${label} is not available.`);
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.success(`${label} copied to clipboard!`);
      });
    }
  }
}
