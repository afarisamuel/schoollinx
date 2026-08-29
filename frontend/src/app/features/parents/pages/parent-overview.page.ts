import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-overview',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './parent-overview.page.html'
})
export class ParentOverviewPage {
    state = inject(ParentStateService);

    avgAttendance = computed(() => {
        const students = this.state.profile()?.students || [];
        if (!students.length) return 0;
        const att = this.state.attendanceMap();
        const total = students.reduce((sum, s) => sum + (att[s.id || '']?.percentage || 0), 0);
        return Math.round(total / students.length);
    });
}
