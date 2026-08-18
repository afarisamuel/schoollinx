import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IntelligenceService, InstitutionalKPI, RetentionRisk } from '../../../core/infrastructure/intelligence/intelligence.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-executive-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './executive-dashboard.component.html',
    styleUrl: './executive-dashboard.component.css'
})
export class ExecutiveDashboardComponent implements OnInit {
    private intelligenceService = inject(IntelligenceService);
    private platformId = inject(PLATFORM_ID);

    kpis = signal<InstitutionalKPI | null>(null);
    risks = signal<RetentionRisk[]>([]);
    isLoading = signal(true);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadTelemetry();
        }
    }

    loadTelemetry() {
        this.isLoading.set(true);
        forkJoin({
            kpis: this.intelligenceService.getKPIs(),
            risks: this.intelligenceService.getRetentionRisks(),
        }).subscribe({
            next: (data) => {
                this.kpis.set(data.kpis);
                this.risks.set(data.risks);
                this.isLoading.set(false);
            },
            error: () => {
                console.error('Failed to load institutional telemetry');
                this.isLoading.set(false);
            }
        });
    }

    exportSummary() {
        window.open('/api/intelligence/export', '_blank');
    }
}
