import { Component, OnInit, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IntelligenceService, InstitutionalKPI, RetentionRisk, CourseDemand } from '../../core/infrastructure/intelligence/intelligence.service';
import { AnalyticsService, AttendanceStats, ChartData, DemographicsStats } from '../../core/infrastructure/analytics/analytics.service';
import { FiscalService, FiscalRecord, FiscalSummary } from '../../core/infrastructure/fiscal/fiscal.service';
import { ClassService, Class } from '../../core/infrastructure/curriculum/class.service';
import { TeacherService } from '../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../core/domain/teacher.model';
import { AuthService } from '../../core/infrastructure/auth/auth.service';
import { TeacherPortalService } from '../../core/infrastructure/teacher/teacher-portal.service';
import { AcademicPeriodService } from '../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../core/domain/academic-period.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private intelligenceService = inject(IntelligenceService);
  private analyticsService = inject(AnalyticsService);
  private fiscalService = inject(FiscalService);
  private classService = inject(ClassService);
  private teacherService = inject(TeacherService);
  private authService = inject(AuthService);
  private teacherPortalService = inject(TeacherPortalService);
  private academicPeriodService = inject(AcademicPeriodService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Live Backend Signals (100% Real Data)
  isLoading = signal<boolean>(true);
  kpis = signal<InstitutionalKPI | null>(null);
  activePeriod = signal<AcademicPeriod | null>(null);
  attendanceStats = signal<AttendanceStats | null>(null);
  gradeDistribution = signal<ChartData[]>([]);
  demographics = signal<DemographicsStats | null>(null);
  retentionRisks = signal<RetentionRisk[]>([]);
  courseDemands = signal<CourseDemand[]>([]);
  classesList = signal<Class[]>([]);
  teachersList = signal<Teacher[]>([]);
  fiscalSummary = signal<FiscalSummary | null>(null);
  recentFiscalRecords = signal<FiscalRecord[]>([]);

  // Roles
  isAdmin = computed(() => this.authService.currentUserValue?.role === 'ADMIN' || this.authService.currentUserValue?.role === 'ECOPOWER_ADMIN');
  isTeacher = computed(() => this.authService.currentUserValue?.role === 'TEACHER');
  isGuardian = computed(() => this.authService.currentUserValue?.role === 'GUARDIAN');
  isStudent = computed(() => this.authService.currentUserValue?.role === 'STUDENT');

  canCollectFees = signal<boolean>(false);
  teacherClassesCount = signal<number>(0);

  // Real Header Metadata
  currentAcademicPeriod = computed(() => {
    const period = this.activePeriod();
    if (period?.name) return period.name;
    const kpiPeriod = this.kpis()?.active_academic_year;
    if (kpiPeriod && kpiPeriod !== 'None Active') return kpiPeriod;
    return 'Active Session';
  });

  currentAcademicTerm = computed(() => {
    const period = this.activePeriod();
    if (period && period.current_term) return `${period.term_type || 'Term'} ${period.current_term}`;
    const kpiTerm = this.kpis()?.active_term;
    if (kpiTerm && kpiTerm !== 'N/A') return kpiTerm;
    return 'Term 1';
  });

  // Real KPI Computations
  totalStudents = computed(() => this.kpis()?.total_students || 0);
  totalTeachers = computed(() => this.kpis()?.total_teachers || this.teachersList().length || 0);
  totalGuardians = computed(() => this.kpis()?.total_guardians || 0);
  averageAttendance = computed(() => this.kpis()?.average_attendance || 0);
  averageGpa = computed(() => this.kpis()?.average_gpa || 0);
  totalRevenue = computed(() => this.kpis()?.total_revenue || 0);
  libraryLoans = computed(() => this.kpis()?.library_loans || 0);

  // Real Grade Distribution
  realGradeData = computed(() => {
    const data = this.gradeDistribution();
    if (!data || data.length === 0) return [];
    const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
    return data.map(item => {
      const pct = Math.round((item.value / total) * 100);
      let color = '#6366F1';
      let title = `Grade ${item.name}`;
      if (item.name === 'A') {
        color = '#10B981';
        title = 'Grade A (Excellence 80-100%)';
      } else if (item.name === 'B') {
        color = '#6366F1';
        title = 'Grade B (Very Good 70-79%)';
      } else if (item.name === 'C') {
        color = '#3B82F6';
        title = 'Grade C (Good 60-69%)';
      } else if (item.name === 'D') {
        color = '#F59E0B';
        title = 'Grade D (Pass 50-59%)';
      } else if (item.name === 'F') {
        color = '#EF4444';
        title = 'Grade F (Remedial <50%)';
      }
      return {
        label: item.name,
        title,
        count: item.value,
        pct,
        color
      };
    });
  });

  totalGradedAssessments = computed(() => {
    return this.gradeDistribution().reduce((acc, curr) => acc + curr.value, 0);
  });

  // Real Attendance Breakdown
  realAttendance = computed(() => {
    const stats = this.attendanceStats();
    if (!stats) {
      return { total: 0, present: 0, absent: 0, tardy: 0, presentPct: 0, absentPct: 0, tardyPct: 0 };
    }
    const total = stats.present + stats.absent + (stats.tardy || 0);
    if (total === 0) {
      return { total: 0, present: 0, absent: 0, tardy: 0, presentPct: 0, absentPct: 0, tardyPct: 0 };
    }
    return {
      total,
      present: stats.present,
      absent: stats.absent,
      tardy: stats.tardy || 0,
      presentPct: Math.round((stats.present / total) * 100),
      absentPct: Math.round((stats.absent / total) * 100),
      tardyPct: Math.round(((stats.tardy || 0) / total) * 100)
    };
  });

  // Real Demographics
  realDemographics = computed(() => {
    const demo = this.demographics();
    const total = demo?.total_students || this.totalStudents();
    const male = demo?.male || 0;
    const female = demo?.female || 0;
    const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
    const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
    return {
      total,
      male,
      female,
      malePct,
      femalePct
    };
  });

  // Real Fiscal Aggregates & Stream Breakdown
  realFiscal = computed(() => {
    const paidRevenue = this.totalRevenue();
    const records = this.recentFiscalRecords();
    const catMap = new Map<string, { amount: number, count: number }>();
    
    records.forEach(r => {
      const cat = r.category || 'General';
      const existing = catMap.get(cat) || { amount: 0, count: 0 };
      existing.amount += (r.amount_paid || (r.status === 'PAID' ? r.amount : 0));
      existing.count += 1;
      catMap.set(cat, existing);
    });

    const categoryBreakdown: { name: string, amount: number, pct: number, color: string }[] = [];
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#8B5CF6'];
    let colorIdx = 0;
    catMap.forEach((val, key) => {
      const pct = paidRevenue > 0 ? Math.round((val.amount / paidRevenue) * 100) : 0;
      categoryBreakdown.push({
        name: key,
        amount: val.amount,
        pct,
        color: colors[colorIdx % colors.length]
      });
      colorIdx++;
    });

    return {
      totalPaid: paidRevenue,
      categories: categoryBreakdown
    };
  });

  ngOnInit() {
    if (this.isBrowser) {
      const userRole = this.authService.currentUserValue?.role;
      if (userRole === 'GUARDIAN') {
        this.router.navigate(['/parents']);
        return;
      }
      if (userRole === 'STUDENT') {
        this.router.navigate(['/portal']);
        return;
      }

      this.loadRealDashboardData();
    }
  }

  loadRealDashboardData() {
    this.isLoading.set(true);

    // 1. Institutional KPIs
    this.intelligenceService.getKPIs().subscribe({
      next: data => this.kpis.set(data),
      error: () => {}
    });

    // 2. Active Session
    this.academicPeriodService.getActive().subscribe({
      next: period => this.activePeriod.set(period),
      error: () => {}
    });

    // 3. Real Attendance Stats
    this.analyticsService.getAttendanceStats().subscribe({
      next: data => this.attendanceStats.set(data),
      error: () => {}
    });

    // 4. Real Grade Distribution
    this.analyticsService.getGradeDistribution().subscribe({
      next: data => this.gradeDistribution.set(data),
      error: () => {}
    });

    // 5. Real Demographics
    this.analyticsService.getDemographics().subscribe({
      next: data => this.demographics.set(data),
      error: () => {}
    });

    // 6. Real Retention Risks
    this.intelligenceService.getRetentionRisks().subscribe({
      next: data => this.retentionRisks.set(data || []),
      error: () => {}
    });

    // 7. Real Course Demand
    this.intelligenceService.getCourseDemand().subscribe({
      next: data => this.courseDemands.set(data || []),
      error: () => {}
    });

    // 8. Real Classes
    this.classService.getClasses().subscribe({
      next: data => this.classesList.set(data || []),
      error: () => {}
    });

    // 9. Real Teachers
    this.teacherService.getTeachers().subscribe({
      next: data => this.teachersList.set(data || []),
      error: () => {}
    });

    // 10. Real Recent Fiscal Records
    this.fiscalService.getRecords().subscribe({
      next: data => {
        this.recentFiscalRecords.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // Teacher assignments count
    if (this.isTeacher()) {
      this.teacherPortalService.getMyClasses().subscribe({
        next: data => {
          this.canCollectFees.set(data.teacher?.can_collect_fees || false);
          this.teacherClassesCount.set(data.assignments?.length || 0);
        },
        error: () => {}
      });
    }
  }
}
