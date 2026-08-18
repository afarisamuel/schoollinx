import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService, RiskAlert } from '../../../core/infrastructure/analytics/analytics.service';

@Component({
    selector: 'app-at-risk-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, DecimalPipe],
    templateUrl: './at-risk-dashboard.component.html',
    styleUrl: './at-risk-dashboard.component.css'
})
export class AtRiskDashboardComponent implements OnInit {
    private analyticsService = inject(AnalyticsService);

    atRiskStudents = signal<RiskAlert[]>([]);
    isLoading = signal(true);
    filterRiskLevel = signal<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');

    filteredStudents = computed(() => {
        const students = this.atRiskStudents();
        if (this.filterRiskLevel() === 'ALL') return students;
        return students.filter(s => s.level.toUpperCase() === this.filterRiskLevel());
    });

    highRiskCount = computed(() => this.atRiskStudents().filter(s => s.level === 'HIGH').length);
    mediumRiskCount = computed(() => this.atRiskStudents().filter(s => s.level === 'MEDIUM').length);

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        this.analyticsService.getRiskAlerts().subscribe({
            next: (data) => {
                this.atRiskStudents.set(data || []);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load at risk students:', err);
                this.isLoading.set(false);
            }
        });
    }

    setFilter(level: 'ALL' | 'HIGH' | 'MEDIUM') {
        this.filterRiskLevel.set(level);
    }
}
