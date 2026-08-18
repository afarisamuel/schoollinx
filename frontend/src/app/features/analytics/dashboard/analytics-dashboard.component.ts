import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AnalyticsService, ChartData, AttendanceAnomaly } from '../../../core/infrastructure/analytics/analytics.service';
import { IntelligenceService, InstitutionalKPI, RetentionRisk, CourseDemand } from '../../../core/infrastructure/intelligence/intelligence.service';
import { forkJoin } from 'rxjs';
import { signal, computed } from '@angular/core';
import * as shape from 'd3-shape';

@Component({
    selector: 'app-analytics-dashboard',
    standalone: true,
    imports: [CommonModule, NgxChartsModule, RouterLink],
    templateUrl: './analytics-dashboard.component.html',
    styleUrl: './analytics-dashboard.component.css'
})
export class AnalyticsDashboardComponent implements OnInit {
    private analyticsService = inject(AnalyticsService);
    private intelligenceService = inject(IntelligenceService);

    // Signals for reactive state
    kpis = signal<InstitutionalKPI | null>(null);
    gradeData = signal<ChartData[]>([]);
    attendanceData = signal<any[]>([]);
    risks = signal<RetentionRisk[]>([]);
    demands = signal<CourseDemand[]>([]);
    heatmapData = signal<any[]>([]);
    demographics = signal<any>(null);
    anomalies = signal<AttendanceAnomaly[]>([]);
    isLoading = signal(true);

    colorScheme: any = {
        domain: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']
    };

    attendanceColorScheme: any = {
        domain: ['#10b981', '#ef4444', '#f59e0b']
    };

    curve = shape.curveLinear;

    demandChartData = computed(() => {
        return this.demands().slice(0, 5).map(d => ({
            name: d.subject_name,
            value: d.projected_demand
        }));
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        
        forkJoin({
            grades: this.analyticsService.getGradeDistribution(),
            attendance: this.analyticsService.getAttendanceStats(),
            kpis: this.intelligenceService.getKPIs(),
            risks: this.intelligenceService.getRetentionRisks(),
            demands: this.intelligenceService.getCourseDemand(),
            heatmap: this.analyticsService.getResourceHeatmap(),
            demographics: this.analyticsService.getDemographics(),
            anomalies: this.analyticsService.getAttendanceAnomalies()
        }).subscribe({
            next: (data) => {
                this.gradeData.set(data.grades);
                this.attendanceData.set([
                    { name: 'Present', value: data.attendance.present },
                    { name: 'Absent', value: data.attendance.absent },
                    { name: 'Tardy', value: data.attendance.tardy }
                ]);
                this.kpis.set(data.kpis);
                this.risks.set(data.risks);
                this.demands.set(data.demands);
                this.demographics.set(data.demographics);
                this.anomalies.set(data.anomalies || []);
                
                // Format heatmap data for ngx-charts HeatMap
                // ngx-charts expects: [{ name: 'Category', series: [{ name: 'X', value: Y }] }]
                const grouped = new Map<string, any[]>();
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                data.heatmap.forEach(item => {
                    if (!grouped.has(item.room_name)) {
                        grouped.set(item.room_name, []);
                    }
                    const dayName = days[item.day_of_week] || 'Unknown';
                    grouped.get(item.room_name)?.push({
                        name: `${dayName} ${item.hour_of_day}:00`,
                        value: item.utilization
                    });
                });
                
                const formattedHeatmap: any[] = [];
                grouped.forEach((series, name) => {
                    formattedHeatmap.push({ name, series });
                });
                this.heatmapData.set(formattedHeatmap);

                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Analytics Synchronization Failure:', err);
                this.isLoading.set(false);
            }
        });
    }

    downloadExecutiveReport() {
        this.analyticsService.downloadExecutiveReport();
    }
}
