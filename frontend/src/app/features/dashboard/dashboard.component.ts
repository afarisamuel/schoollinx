import { Component, OnInit, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  canCollectFees = signal<boolean>(false);

  // Drag and Drop Widgets
  isEditMode = signal(false);
  activeWidgets = signal<string[]>([]);
  defaultAdminWidgets = [
    'strategic-core', 'student-registry', 'faculty-staff', 'guardians', 'academic-hub',
    'attendance', 'classes', 'biometrics', 'hr', 'operations-hub',
    'financial-ledger', 'at-risk', 'intelligence-hub', 'executive-dashboard',
    'connectivity-hub', 'library', 'clubs', 'messages', 'settings-hub'
  ];
  defaultTeacherWidgets = ['student-registry', 'attendance', 'teacher-portal', 'daily-collection'];

  ngOnInit() {
    if (this.isBrowser) {
      this.loadCommonData();
      this.initializeWidgets();
      if (this.isAdmin()) {
        this.loadAdminInsights();
      } else if (this.isTeacher()) {
        this.teacherService.getMyClasses().subscribe(data => {
          this.canCollectFees.set(data.teacher?.can_collect_fees || false);
        });
      }
    }
  }

  private loadCommonData() {
    this.intelligenceService.getKPIs().subscribe(data => this.kpis.set(data));
    this.analyticsService.getAttendanceStats().subscribe(data => this.attendanceStats.set(data));
    this.analyticsService.getGradeDistribution().subscribe(data => this.gradeDistribution.set(data));
  }

  private loadAdminInsights() {
    this.insightsService.getAtRiskStudents().subscribe(data => this.atRiskStudents.set(data));
    this.intelligenceService.getRetentionRisks().subscribe(data => this.retentionRisks.set(data));
    this.intelligenceService.getCourseDemand().subscribe(data => this.courseDemands.set(data));
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
    const wideWidgets = ['academic-hub', 'operations-hub', 'financial-ledger', 'connectivity-hub', 'settings-hub', 'teacher-portal'];
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
