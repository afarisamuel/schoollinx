import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-health',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-health.page.html'
})
export class ParentHealthPage {
    state = inject(ParentStateService);

    approvedDays(): number {
        return this.state.absenceRequests()
            .filter(a => a.status === 'APPROVED')
            .reduce((t, a) => t + Math.max(1, Math.round(
                (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000
            ) + 1), 0);
    }

    statusClass(status: string): string {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    }
}
