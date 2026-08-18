import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IntelligenceService, RetentionRisk } from '../../../core/infrastructure/intelligence/intelligence.service';

@Component({
    selector: 'app-retention-risk',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './retention-risk.component.html',
})
export class RetentionRiskComponent implements OnInit {
    private intelligenceService = inject(IntelligenceService);

    risks = signal<RetentionRisk[]>([]);
    isLoading = signal(true);
    filterLevel = signal<'all' | 'high' | 'medium' | 'low'>('all');

    filteredRisks = () => {
        const all = this.risks();
        const level = this.filterLevel();
        if (level === 'all') return all;
        if (level === 'high') return all.filter(r => r.risk_score > 0.7);
        if (level === 'medium') return all.filter(r => r.risk_score > 0.4 && r.risk_score <= 0.7);
        return all.filter(r => r.risk_score <= 0.4);
    };

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        this.intelligenceService.getRetentionRisks().subscribe({
            next: (risks) => {
                this.risks.set(risks || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    setFilter(level: 'all' | 'high' | 'medium' | 'low') {
        this.filterLevel.set(level);
    }

    getRiskLabel(score: number): string {
        if (score > 0.7) return 'High';
        if (score > 0.4) return 'Medium';
        return 'Low';
    }

    highCount = () => this.risks().filter(r => r.risk_score > 0.7).length;
    mediumCount = () => this.risks().filter(r => r.risk_score > 0.4 && r.risk_score <= 0.7).length;
    lowCount = () => this.risks().filter(r => r.risk_score <= 0.4).length;
}
