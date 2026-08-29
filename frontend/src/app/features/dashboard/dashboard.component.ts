import { Component, OnInit, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { InsightsService, StudentSuccessScore } from '../../core/infrastructure/insights/insights.service';
import { IntelligenceService, InstitutionalKPI, RetentionRisk, CourseDemand } from '../../core/infrastructure/intelligence/intelligence.service';
import { AnalyticsService, AttendanceStats, ChartData } from '../../core/infrastructure/analytics/analytics.service';
import { AuthService } from '../../core/infrastructure/auth/auth.service';
import { TeacherPortalService } from '../../core/infrastructure/teacher/teacher-portal.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, DragDropModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private insightsService = inject(InsightsService);
  private intelligenceService = inject(IntelligenceService);
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);
  private teacherService = inject(TeacherPortalService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Core KPIs & Analytics
  kpis = signal<InstitutionalKPI | null>(null);
  attendanceStats = signal<AttendanceStats | null>(null);
  gradeDistribution = signal<ChartData[]>([]);

  // Predictive Insights
  atRiskStudents = signal<StudentSuccessScore[]>([]);
  retentionRisks = signal<RetentionRisk[]>([]);
  courseDemands = signal<CourseDemand[]>([]);

  isAdmin = computed(() => this.authService.currentUserValue?.role === 'ADMIN');
  isTeacher = computed(() => this.authService.currentUserValue?.role === 'TEACHER');
  isGuardian = computed(() => this.authService.currentUserValue?.role === 'GUARDIAN');
  isStudent = computed(() => this.authService.currentUserValue?.role === 'STUDENT');
  canCollectFees = signal<boolean>(false);
  teacherClassesCount = signal<number>(0);

  // Drag and Drop Widgets
  isEditMode = signal(false);
  activeWidgets = signal<string[]>([]);
  defaultAdminWidgets = [
    'strategic-core', 'student-registry', 'faculty-staff', 'guardians', 'academic-hub',
    'attendance', 'classes', 'biometrics', 'hr', 'operations-hub',
    'financial-ledger', 'at-risk', 'intelligence-hub', 'executive-dashboard',
    'connectivity-hub', 'library', 'clubs', 'messages', 'settings-hub'
  ];
  defaultTeacherWidgets = [
    'teacher-portal',
    'teacher-timetable',
    'teacher-lessons',
    'teacher-seating',
    'teacher-homework',
    'teacher-cbt',
    'teacher-cover',
    'teacher-consultations',
    'teacher-conduct',
    'teacher-sickbay',
    'teacher-notices',
    'teacher-ai',
    'teacher-hr',
    'student-registry',
    'attendance',
    'house-cup',
    'daily-collection'
  ];

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

      this.loadCommonData();
      this.initializeWidgets();
      if (this.isAdmin()) {
        this.loadAdminInsights();
      } else if (this.isTeacher()) {
        this.teacherService.getMyClasses().subscribe({
          next: data => {
            this.canCollectFees.set(data.teacher?.can_collect_fees || false);
            this.teacherClassesCount.set(data.assignments?.length || 0);
          },
          error: () => {}
        });
      }
    }
  }

  private loadCommonData() {
    this.intelligenceService.getKPIs().subscribe({
      next: data => this.kpis.set(data),
      error: () => {}
    });
    this.analyticsService.getAttendanceStats().subscribe({
      next: data => this.attendanceStats.set(data),
      error: () => {}
    });
    this.analyticsService.getGradeDistribution().subscribe({
      next: data => this.gradeDistribution.set(data),
      error: () => {}
    });
  }

  private loadAdminInsights() {
    this.insightsService.getAtRiskStudents().subscribe({
      next: data => this.atRiskStudents.set(data),
      error: () => {}
    });
    this.intelligenceService.getRetentionRisks().subscribe({
      next: data => this.retentionRisks.set(data),
      error: () => {}
    });
    this.intelligenceService.getCourseDemand().subscribe({
      next: data => this.courseDemands.set(data),
      error: () => {}
    });
  }

  private initializeWidgets() {
    const roleKey = this.isAdmin() ? 'admin' : 'teacher';
    const savedLayout = localStorage.getItem(`dashboard_layout_${roleKey}`);
    const defaultWidgets = this.isAdmin() ? [...this.defaultAdminWidgets] : [...this.defaultTeacherWidgets];

    if (savedLayout) {
      try {
        let saved = JSON.parse(savedLayout) as string[];
        const missingWidgets = defaultWidgets.filter(w => !saved.includes(w));
        if (missingWidgets.length > 0) {
          saved = [...saved, ...missingWidgets];
          localStorage.setItem(`dashboard_layout_${roleKey}`, JSON.stringify(saved));
        }
        this.activeWidgets.set(saved);
      } catch (e) {
        this.activeWidgets.set(defaultWidgets);
      }
    } else {
      this.activeWidgets.set(defaultWidgets);
    }
  }

  toggleEditMode() {
    this.isEditMode.set(!this.isEditMode());
  }

  resetLayout() {
    const defaults = this.isAdmin() ? [...this.defaultAdminWidgets] : [...this.defaultTeacherWidgets];
    this.activeWidgets.set(defaults);
    const roleKey = this.isAdmin() ? 'admin' : 'teacher';
    localStorage.removeItem(`dashboard_layout_${roleKey}`);
  }

  onWidgetDrop(event: CdkDragDrop<string[]>) {
    const newOrder = [...this.activeWidgets()];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.activeWidgets.set(newOrder);

    const roleKey = this.isAdmin() ? 'admin' : 'teacher';
    localStorage.setItem(`dashboard_layout_${roleKey}`, JSON.stringify(newOrder));
  }

  getWidgetClass(widgetId: string): string {
    const wideWidgets = [
      'academic-hub', 'operations-hub', 'financial-ledger', 'connectivity-hub', 'settings-hub', 
      'teacher-portal', 'teacher-homework', 'teacher-cbt', 'teacher-ai'
    ];
    const largeWidgets = ['strategic-core', 'intelligence-hub'];
    if (wideWidgets.includes(widgetId)) {
      return 'bento-wide';
    }
    if (largeWidgets.includes(widgetId)) {
      return 'bento-large';
    }
    return '';
  }
}
