import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FiscalService, FeeStructure } from '../../../core/infrastructure/fiscal/fiscal.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { TransportRoute, BusAssignment } from '../../../core/domain/logistics.model';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { forkJoin } from 'rxjs';

export interface StudentDailySummary {
  student: Student;
  route: TransportRoute | null;
  standardDailyFee: number;
  routeDailyFee: number;
  totalDailyFee: number;
}

@Component({
  selector: 'app-daily-fee-config',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterModule],
  templateUrl: './daily-fee-config.component.html'
})
export class DailyFeeConfigComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  private academicPeriodService = inject(AcademicPeriodService);
  private logisticsService = inject(LogisticsService);
  private classService = inject(ClassService);
  private studentService = inject(StudentService);
  private dialog = inject(DialogService);
  private toast = inject(ToastService);

  // Core State
  isLoading = signal(true);
  academicPeriods = signal<AcademicPeriod[]>([]);
  selectedPeriodId = signal<string>('');
  activePeriod = signal<AcademicPeriod | null>(null);

  dailyFeeStructures = signal<FeeStructure[]>([]);
  routes = signal<TransportRoute[]>([]);
  classes = signal<Class[]>([]);
  students = signal<Student[]>([]);
  busAssignments = signal<BusAssignment[]>([]);

  // Navigation Tab
  activeTab = signal<'matrix' | 'standards' | 'routes' | 'operations'>('matrix');

  // Search & Filter
  searchTerm = signal('');
  selectedClassFilter = signal('');
  selectedRouteFilter = signal('');

  // Modals & Sub-forms
  showStandardFeeModal = signal(false);
  editingFeeId = signal<string | null>(null);
  newStandardFee: {
    category: string;
    amount: number;
    all_classes: boolean;
    class_ids: string[];
  } = {
    category: 'CANTEEN',
    amount: 10,
    all_classes: true,
    class_ids: []
  };

  showRouteModal = signal(false);
  editingRouteId = signal<string | null>(null);
  routeForm: {
    name: string;
    driver_name: string;
    driver_phone: string;
    vehicle_plate: string;
    capacity: number;
    daily_fee: number;
  } = {
    name: '',
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    capacity: 30,
    daily_fee: 10
  };

  showAssignModal = signal(false);
  selectedStudentForAssign = signal<Student | null>(null);
  targetRouteId = signal<string>('');

  showTopUpModal = signal(false);
  selectedStudentForTopUp = signal<Student | null>(null);
  topUpAmount = signal<number>(50);
  topUpNotes = signal<string>('Cash top-up via Admin Daily Hub');

  // Computed Summaries
  totalStandardDailyRate = computed(() => {
    return this.dailyFeeStructures().reduce((acc, f) => acc + (f.amount || 0), 0);
  });

  averageRouteDailyRate = computed(() => {
    const r = this.routes();
    if (r.length === 0) return 0;
    const total = r.reduce((acc, route) => acc + (route.daily_fee || 0), 0);
    return total / r.length;
  });

  studentMatrix = computed<StudentDailySummary[]>(() => {
    const stList = this.students();
    const routeList = this.routes();
    const assignMap = new Map<string, string>();
    this.busAssignments().forEach(a => {
      assignMap.set(a.student_id, a.route_id);
    });

    const standardRate = this.totalStandardDailyRate();

    return stList.map(st => {
      const rId = assignMap.get(st.id || '');
      const assignedRoute = rId ? routeList.find(r => r.id === rId) || null : null;
      const routeFee = assignedRoute?.daily_fee || 0;
      return {
        student: st,
        route: assignedRoute,
        standardDailyFee: standardRate,
        routeDailyFee: routeFee,
        totalDailyFee: standardRate + routeFee
      };
    });
  });

  filteredMatrix = computed<StudentDailySummary[]>(() => {
    const list = this.studentMatrix();
    const term = this.searchTerm().toLowerCase().trim();
    const cFilter = this.selectedClassFilter();
    const rFilter = this.selectedRouteFilter();

    return list.filter(item => {
      const matchSearch = !term ||
        (item.student.first_name + ' ' + item.student.last_name).toLowerCase().includes(term) ||
        (item.student.enrollment_num || '').toLowerCase().includes(term);

      const matchClass = !cFilter || item.student.class_id === cFilter;

      let matchRoute = true;
      if (rFilter === 'WALK_IN') {
        matchRoute = !item.route;
      } else if (rFilter) {
        matchRoute = item.route?.id === rFilter;
      }

      return matchSearch && matchClass && matchRoute;
    });
  });

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading.set(true);
    forkJoin({
      periods: this.academicPeriodService.getAll(),
      classes: this.classService.getClasses(),
      routes: this.logisticsService.getRoutes(),
      students: this.studentService.getStudents()
    }).subscribe({
      next: (res: { periods: AcademicPeriod[]; classes: Class[]; routes: TransportRoute[]; students: Student[] }) => {
        this.academicPeriods.set(res.periods || []);
        this.classes.set(res.classes || []);
        this.routes.set(res.routes || []);
        this.students.set(res.students || []);

        const active = res.periods?.find((p: AcademicPeriod) => p.is_active) || res.periods?.[0];
        if (active) {
          this.activePeriod.set(active);
          this.selectedPeriodId.set(active.id);
          this.loadDailyFeeStructures(active.id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.toast.error('Failed to load initial daily fee configuration.');
        this.isLoading.set(false);
      }
    });
  }

  onPeriodChange(periodId: string) {
    this.selectedPeriodId.set(periodId);
    const p = this.academicPeriods().find(x => x.id === periodId);
    if (p) {
      this.activePeriod.set(p);
      this.loadDailyFeeStructures(periodId);
    }
  }

  loadDailyFeeStructures(periodId: string) {
    this.isLoading.set(true);
    this.fiscalService.getFeeStructures(periodId).subscribe({
      next: (structures) => {
        const dailyOnes = (structures || []).filter(f => f.frequency === 'DAILY');
        this.dailyFeeStructures.set(dailyOnes);
        this.isLoading.set(false);
      },
      error: () => {
        this.dailyFeeStructures.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // --- Standard Daily Fee Management ---
  openStandardFeeModal(fee?: FeeStructure) {
    if (fee) {
      this.editingFeeId.set(fee.id || null);
      this.newStandardFee = {
        category: fee.category,
        amount: fee.amount,
        all_classes: fee.all_classes ?? true,
        class_ids: fee.class_ids ? [...fee.class_ids] : []
      };
    } else {
      this.editingFeeId.set(null);
      this.newStandardFee = {
        category: 'CANTEEN',
        amount: 10,
        all_classes: true,
        class_ids: []
      };
    }
    this.showStandardFeeModal.set(true);
  }

  closeStandardFeeModal() {
    this.showStandardFeeModal.set(false);
    this.editingFeeId.set(null);
  }

  saveStandardFee() {
    const periodId = this.selectedPeriodId();
    if (!periodId) {
      this.toast.error('Please select an active academic period first.');
      return;
    }

    if (this.newStandardFee.amount <= 0) {
      this.toast.error('Please enter a valid daily amount.');
      return;
    }

    const payload: Partial<FeeStructure> = {
      academic_period_id: periodId,
      category: this.newStandardFee.category,
      amount: this.newStandardFee.amount,
      frequency: 'DAILY',
      is_term_fee: false,
      all_classes: this.newStandardFee.all_classes,
      class_ids: this.newStandardFee.all_classes ? [] : this.newStandardFee.class_ids
    };

    this.fiscalService.setFeeStructure(payload).subscribe({
      next: () => {
        this.toast.success('Daily service fee saved successfully.');
        this.closeStandardFeeModal();
        this.loadDailyFeeStructures(periodId);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to save daily fee head.');
      }
    });
  }

  deleteStandardFee(feeId: string) {
    this.dialog.confirm('Are you sure you want to remove this daily fee head?').subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.fiscalService.deleteFeeStructure(feeId).subscribe({
        next: () => {
          this.toast.success('Daily fee head removed.');
          this.loadDailyFeeStructures(this.selectedPeriodId());
        },
        error: () => this.toast.error('Failed to remove daily fee head.')
      });
    });
  }

  // --- Transport Route Daily Fee Management ---
  openRouteModal(route?: TransportRoute) {
    if (route) {
      this.editingRouteId.set(route.id || null);
      this.routeForm = {
        name: route.name,
        driver_name: route.driver_name || '',
        driver_phone: route.driver_phone || '',
        vehicle_plate: route.vehicle_plate || '',
        capacity: route.capacity || 30,
        daily_fee: route.daily_fee || 0
      };
    } else {
      this.editingRouteId.set(null);
      this.routeForm = {
        name: '',
        driver_name: '',
        driver_phone: '',
        vehicle_plate: '',
        capacity: 30,
        daily_fee: 10
      };
    }
    this.showRouteModal.set(true);
  }

  closeRouteModal() {
    this.showRouteModal.set(false);
    this.editingRouteId.set(null);
  }

  saveRoute() {
    if (!this.routeForm.name.trim()) {
      this.toast.error('Please enter a route name.');
      return;
    }

    const payload: Partial<TransportRoute> = {
      ...(this.editingRouteId() ? { id: this.editingRouteId()! } : {}),
      name: this.routeForm.name.trim(),
      driver_name: this.routeForm.driver_name,
      driver_phone: this.routeForm.driver_phone,
      vehicle_plate: this.routeForm.vehicle_plate,
      capacity: this.routeForm.capacity,
      daily_fee: this.routeForm.daily_fee
    };

    this.logisticsService.addRoute(payload).subscribe({
      next: () => {
        this.toast.success('Transport route and daily fare updated.');
        this.closeRouteModal();
        this.logisticsService.getRoutes().subscribe(r => this.routes.set(r || []));
      },
      error: () => this.toast.error('Failed to save transport route.')
    });
  }

  deleteRoute(routeId: string) {
    this.dialog.confirm('Delete this transport route and remove route daily fee?').subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.logisticsService.deleteRoute(routeId).subscribe({
        next: () => {
          this.toast.success('Transport route deleted.');
          this.logisticsService.getRoutes().subscribe(r => this.routes.set(r || []));
        },
        error: () => this.toast.error('Failed to delete transport route.')
      });
    });
  }

  // --- Assign Student Route ---
  openAssignModal(student: Student, currentRoute: TransportRoute | null) {
    this.selectedStudentForAssign.set(student);
    this.targetRouteId.set(currentRoute?.id || '');
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
    this.selectedStudentForAssign.set(null);
  }

  saveStudentRouteAssignment() {
    const st = this.selectedStudentForAssign();
    if (!st?.id) return;

    const routeId = this.targetRouteId();
    if (!routeId) {
      // Walk-in / Unassigned
      const current = this.busAssignments().filter(a => a.student_id !== st.id);
      this.busAssignments.set(current);
      this.toast.success(`${st.first_name} marked as Walk-in (Standard daily fee only).`);
      this.closeAssignModal();
      return;
    }

    this.logisticsService.assignTransport({
      student_id: st.id,
      route_id: routeId
    }).subscribe({
      next: (assignment) => {
        const other = this.busAssignments().filter(a => a.student_id !== st.id);
        this.busAssignments.set([...other, assignment]);
        this.toast.success(`Transport route assigned to ${st.first_name}.`);
        this.closeAssignModal();
      },
      error: () => this.toast.error('Failed to assign student route.')
    });
  }

  // --- Quick Wallet Top-Up ---
  openTopUpModal(student: Student) {
    this.selectedStudentForTopUp.set(student);
    this.topUpAmount.set(50);
    this.showTopUpModal.set(true);
  }

  closeTopUpModal() {
    this.showTopUpModal.set(false);
    this.selectedStudentForTopUp.set(null);
  }

  confirmWalletTopUp() {
    const st = this.selectedStudentForTopUp();
    if (!st?.id) return;

    const amt = this.topUpAmount();
    if (amt <= 0) {
      this.toast.error('Please enter a valid top-up amount.');
      return;
    }

    this.fiscalService.topUpWallet(st.id, amt, this.topUpNotes()).subscribe({
      next: () => {
        this.toast.success(`Wallet credited +GH₵${amt.toFixed(2)} for ${st.first_name}.`);
        this.closeTopUpModal();
        this.studentService.getStudents().subscribe(s => this.students.set(s || []));
      },
      error: () => this.toast.error('Failed to top up student wallet.')
    });
  }

  // --- Live Operations / Batch Billing Trigger ---
  triggerDailyBillingBatch() {
    const periodId = this.selectedPeriodId();
    if (!periodId) {
      this.toast.error('Please select an active academic period.');
      return;
    }

    this.dialog.confirm(
      'Are you sure you want to trigger daily fee billing for today? This will automatically process wallet deductions for all active students according to their route & standard daily fees.'
    ).subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.fiscalService.generateDailyBillsFromConfig(periodId).subscribe({
        next: (res) => {
          this.dialog.alert(
            `Successfully billed ${res.count} students for today.\nComputed Base Amount: GH₵${res.amount.toFixed(2)}\nFee Heads: ${res.categories.join(', ')}`,
            'Daily Billing Processed',
            'success'
          );
        },
        error: (err) => {
          this.toast.error(err.error?.error || 'Failed to process daily billing.');
        }
      });
    });
  }
}
