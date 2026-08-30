import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-schedule',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-schedule.page.html'
})
export class ParentSchedulePage {
    state = inject(ParentStateService);
    readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    activeTab = signal<'today' | 'week'>('today');
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

    todayDay() { return new Date().getDay(); }
    dayLabel(d: number) { return this.dayLabels[d] || ''; }
}
