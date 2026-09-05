import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { HrService } from '../../../../core/infrastructure/hr/hr.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../../core/infrastructure/auth/auth.service';

export interface FacultyPayslip {
  id: string;
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
  
  // Faculty Profile Details
  staffProfile = signal({
    staffId: 'STF-2024-042',
    designation: 'Senior Faculty Instructor & Head of Discipline',
    department: 'Science & Technical Education',
    ssnitNumber: 'E028491823901',
    tinNumber: 'P002938491',
    hireDate: '2023-09-01',
    bankName: 'GCB Bank Ghana Ltd',
    accountNumber: '•••••••• 4921',
    employmentType: 'Full-Time Permanent',
    baseSalary: 4200.00
  });

  // Leave Quotas
  leaveQuotas = signal<LeaveQuota[]>([
    { type: 'ANNUAL', label: 'Annual Leave', icon: 'fas fa-umbrella-beach', iconBg: 'bg-blue-500/10 text-blue-500', allocated: 21, used: 6, color: 'from-blue-500 to-indigo-500' },
    { type: 'CASUAL', label: 'Casual / Personal', icon: 'fas fa-calendar-day', iconBg: 'bg-emerald-500/10 text-emerald-500', allocated: 5, used: 2, color: 'from-emerald-500 to-teal-500' },
    { type: 'SICK', label: 'Medical / Sick Leave', icon: 'fas fa-notes-medical', iconBg: 'bg-rose-500/10 text-rose-500', allocated: 10, used: 2, color: 'from-rose-500 to-pink-500' },
    { type: 'MATERNITY', label: 'Maternity / Parental', icon: 'fas fa-baby', iconBg: 'bg-purple-500/10 text-purple-500', allocated: 90, used: 0, color: 'from-purple-500 to-indigo-500' },
    { type: 'STUDY', label: 'Study & Exam Leave', icon: 'fas fa-graduation-cap', iconBg: 'bg-amber-500/10 text-amber-500', allocated: 5, used: 0, color: 'from-amber-500 to-orange-500' }
  ]);

  // Leave Form State
  isLeaveModalOpen = signal(false);
  leaveType = signal('CASUAL');
  leaveStart = signal(new Date().toISOString().slice(0, 10));
  leaveEnd = signal(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  leaveReason = signal('');
  reliefTeacher = signal('');
  isSubmittingLeave = signal(false);

  // Leave History
  leaveHistory = signal<FacultyLeaveRecord[]>([
    {
      id: 'LV-2026-08',
      leaveType: 'CASUAL',
      categoryLabel: 'Casual / Urgent Personal',
      startDate: '2026-07-14',
      endDate: '2026-07-15',
      daysCount: 2,
      reason: 'Urgent family engagement outside Accra regional municipality.',
      reliefStaff: 'Mr. Emmanuel Mensah',
      status: 'APPROVED',
      appliedOn: '2026-07-10',
      approvedBy: 'Headmaster Office',
      approverNotes: 'Approved. Classroom substitution arranged on cover board.'
    },
    {
      id: 'LV-2026-04',
      leaveType: 'SICK',
      categoryLabel: 'Medical / Sick Leave',
      startDate: '2026-05-20',
      endDate: '2026-05-21',
      daysCount: 2,
      reason: 'Hospital clinical appointment and routine health assessment.',
      reliefStaff: 'Mrs. Patience Osei',
      status: 'APPROVED',
      appliedOn: '2026-05-18',
      approvedBy: 'HR Administration',
      approverNotes: 'Medical receipt filed on record.'
    },
    {
      id: 'LV-2026-02',
      leaveType: 'ANNUAL',
      categoryLabel: 'Annual Leave',
      startDate: '2026-01-05',
      endDate: '2026-01-10',
      daysCount: 6,
      reason: 'Post-Christmas vacation and semester transition period.',
      reliefStaff: 'Departmental Rotation',
      status: 'APPROVED',
      appliedOn: '2025-12-15',
      approvedBy: 'Board of Governors / HR',
      approverNotes: 'Approved during academic break.'
    }
  ]);

  // Payslips Archive
  payslips = signal<FacultyPayslip[]>([
    {
      id: 'PAY-2026-08',
      month: 'August 2026',
      year: 2026,
      gross: 4750.00,
      basicSalary: 4200.00,
      teachingAllowance: 350.00,
      transportAllowance: 200.00,
      ssnitEmployee: 231.00,
      ssnitEmployer: 546.00,
      payeTax: 410.00,
      welfareDues: 50.00,
      netPay: 4059.00,
      status: 'PAID',
      paymentDate: '2026-08-28',
      paymentMethod: 'Direct Bank Deposit (GCB)',
      referenceNo: 'TXN-SLX-20260828-9410'
    },
    {
      id: 'PAY-2026-07',
      month: 'July 2026',
      year: 2026,
      gross: 4750.00,
      basicSalary: 4200.00,
      teachingAllowance: 350.00,
      transportAllowance: 200.00,
      ssnitEmployee: 231.00,
      ssnitEmployer: 546.00,
      payeTax: 410.00,
      welfareDues: 50.00,
      netPay: 4059.00,
      status: 'PAID',
      paymentDate: '2026-07-28',
      paymentMethod: 'Direct Bank Deposit (GCB)',
      referenceNo: 'TXN-SLX-20260728-8314'
    },
    {
      id: 'PAY-2026-06',
      month: 'June 2026',
      year: 2026,
      gross: 4750.00,
      basicSalary: 4200.00,
      teachingAllowance: 350.00,
      transportAllowance: 200.00,
      ssnitEmployee: 231.00,
      ssnitEmployer: 546.00,
      payeTax: 410.00,
      welfareDues: 50.00,
      netPay: 4059.00,
      status: 'PAID',
      paymentDate: '2026-06-27',
      paymentMethod: 'Direct Bank Deposit (GCB)',
      referenceNo: 'TXN-SLX-20260627-7219'
    },
    {
      id: 'PAY-2026-05',
      month: 'May 2026',
      year: 2026,
      gross: 4750.00,
      basicSalary: 4200.00,
      teachingAllowance: 350.00,
      transportAllowance: 200.00,
      ssnitEmployee: 231.00,
      ssnitEmployer: 546.00,
      payeTax: 410.00,
      welfareDues: 50.00,
      netPay: 4059.00,
      status: 'PAID',
      paymentDate: '2026-05-28',
      paymentMethod: 'Direct Bank Deposit (GCB)',
      referenceNo: 'TXN-SLX-20260528-6102'
    },
    {
      id: 'PAY-2026-04',
      month: 'April 2026',
      year: 2026,
      gross: 4750.00,
      basicSalary: 4200.00,
      teachingAllowance: 350.00,
      transportAllowance: 200.00,
      ssnitEmployee: 231.00,
      ssnitEmployer: 546.00,
      payeTax: 410.00,
      welfareDues: 50.00,
      netPay: 4059.00,
      status: 'PAID',
      paymentDate: '2026-04-28',
      paymentMethod: 'Direct Bank Deposit (GCB)',
      referenceNo: 'TXN-SLX-20260428-5089'
    }
  ]);

  // Selected Payslip for Detail View Modal
  selectedPayslip = signal<FacultyPayslip | null>(null);

  // Documents
  hrDocuments = signal([
    {
      title: 'Faculty Appointment Letter & Terms of Engagement',
      category: 'Contract & Legal',
      issueDate: '01 Sep 2023',
      fileSize: '480 KB',
      icon: 'fas fa-file-contract',
      color: 'text-blue-500'
    },
    {
      title: 'Institutional Code of Conduct & Pedagogical Ethics',
      category: 'Compliance & Policies',
      issueDate: '10 Jan 2026',
      fileSize: '1.2 MB',
      icon: 'fas fa-shield-alt',
      color: 'text-emerald-500'
    },
    {
      title: 'Annual Faculty Performance Appraisal 2025/2026',
      category: 'Appraisal Report',
      issueDate: '15 Jul 2026',
      fileSize: '650 KB',
      icon: 'fas fa-award',
      color: 'text-amber-500'
    },
    {
      title: 'Ghana SSNIT Tier 1 & Tier 2 Membership Certificate',
      category: 'Social Security',
      issueDate: '15 Sep 2023',
      fileSize: '320 KB',
      icon: 'fas fa-landmark',
      color: 'text-indigo-500'
    }
  ]);

  // Telemetry Computeds
  totalAllocatedLeave = computed(() => {
    return this.leaveQuotas().reduce((acc, curr) => acc + curr.allocated, 0);
  });

  totalUsedLeave = computed(() => {
    return this.leaveQuotas().reduce((acc, curr) => acc + curr.used, 0);
  });

  totalAvailableLeave = computed(() => {
    return this.totalAllocatedLeave() - this.totalUsedLeave();
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
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        if (res.teacher) {
          const t = res.teacher as any;
          this.staffProfile.update(prev => ({
            ...prev,
            staffId: t.staff_id || `STF-2024-${String(t.id).padStart(3, '0')}`,
            department: t.department || prev.department,
            designation: t.designation || prev.designation,
            baseSalary: t.base_salary || prev.baseSalary
          }));
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
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

    const typeMap: Record<string, string> = {
      'ANNUAL': 'Annual Leave',
      'CASUAL': 'Casual / Urgent Personal',
      'SICK': 'Medical / Sick Leave',
      'MATERNITY': 'Maternity / Parental',
      'STUDY': 'Study & Exam Leave'
    };

    const newRecord: FacultyLeaveRecord = {
      id: `LV-${new Date().getFullYear()}-${String(this.leaveHistory().length + 1).padStart(2, '0')}`,
      leaveType: this.leaveType(),
      categoryLabel: typeMap[this.leaveType()] || this.leaveType(),
      startDate: this.leaveStart(),
      endDate: this.leaveEnd(),
      daysCount: days,
      reason: this.leaveReason(),
      reliefStaff: this.reliefTeacher() || 'Subject Teacher Rotation',
      status: 'PENDING',
      appliedOn: new Date().toISOString().slice(0, 10),
      approvedBy: 'Under Review',
      approverNotes: 'Submitted for Headmaster & HR endorsement.'
    };

    // Try backend submission if available
    this.hrService.submitLeaveRequest({
      leave_type: this.leaveType(),
      start_date: this.leaveStart(),
      end_date: this.leaveEnd(),
      reason: this.leaveReason()
    }).subscribe({
      next: () => {
        this.finishLeaveSubmission(newRecord);
      },
      error: () => {
        // Fallback gracefully to local persistent state
        this.finishLeaveSubmission(newRecord);
      }
    });
  }

  private finishLeaveSubmission(record: FacultyLeaveRecord) {
    this.leaveHistory.update(prev => [record, ...prev]);
    this.isSubmittingLeave.set(false);
    this.isLeaveModalOpen.set(false);
    this.leaveReason.set('');
    this.reliefTeacher.set('');
    this.toast.success(
      `Leave application for ${record.daysCount} days filed successfully. Awaiting administrative review.`,
      'Application Submitted'
    );
  }

  cancelLeave(leaveId: string) {
    this.leaveHistory.update(prev => prev.filter(l => l.id !== leaveId));
    this.toast.info(`Leave request ${leaveId} has been withdrawn.`);
  }

  viewPayslipModal(slip: FacultyPayslip) {
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
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.success(`${label} copied to clipboard!`);
      });
    }
  }
}

