import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, RiskAlert } from '../../../core/infrastructure/analytics/analytics.service';

@Component({
    selector: 'app-risk-predictor-widget',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './risk-predictor-widget.component.html',
    styleUrl: './risk-predictor-widget.component.css'
})
export class RiskPredictorWidgetComponent implements OnInit {
    private analyticsService = inject(AnalyticsService);

    alerts = signal<RiskAlert[]>([]);

    highRiskCount = computed(() =>
        this.alerts().filter(a => a.level === 'HIGH').length
    );

    mediumRiskCount = computed(() =>
        this.alerts().filter(a => a.level === 'MEDIUM').length
    );

    ngOnInit() {
        this.analyticsService.getRiskAlerts().subscribe(data => {
            this.alerts.set(data);
        });
    }
}
