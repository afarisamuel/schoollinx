import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';

@Component({
    selector: 'app-parent-health',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-health.page.html'
})
export class ParentHealthPage implements OnInit {
    state = inject(ParentStateService);
    private portalService = inject(ParentPortalService);

    sickbayMap = signal<Record<string, any[]>>({});
    activeTab = signal<'attendance' | 'sickbay' | 'medical' | 'leaves'>('attendance');
    selectedStudentId = signal<string>('');

    selectedStudent = computed(() => {
        const students = this.state.profile()?.students || [];
        if (!students.length) return null;
        return students.find(s => s.id === this.selectedStudentId()) || students[0];
    });

    constructor() {
        effect(() => {
            const students = this.state.profile()?.students || [];
            if (students.length > 0 && !this.selectedStudentId()) {
                this.selectedStudentId.set(students[0].id || '');
            }
        });
    }

    ngOnInit() {
        this.loadSickbayHistory();
    }

    loadSickbayHistory() {
        const students = this.state.profile()?.students || [];
        for (const s of students) {
            if (s.id) {
                this.portalService.getSickbayVisits(s.id).subscribe({
                    next: (visits) => {
                        this.sickbayMap.update(m => ({ ...m, [s.id!]: visits || [] }));
                    },
                    error: () => {}
                });
            }
        }
    }

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
