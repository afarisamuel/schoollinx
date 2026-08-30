import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-homework',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-homework.page.html'
})
export class ParentHomeworkPage {
    state = inject(ParentStateService);

    activeTab = signal<'pending' | 'overdue' | 'all'>('pending');
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

    today() { return new Date().toISOString().slice(0, 10); }

    dueSoon(dueDate: string): boolean {
        const t = this.today();
        const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        return dueDate >= t && dueDate <= soon;
    }
}
