import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-overview',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './parent-overview.page.html',
    styleUrl: './parent-overview.page.css'
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

    overallGpa = computed(() => {
        const gpas = Object.values(this.state.gpaMap());
        if (!gpas.length) return 0;
        const valid = gpas.filter(g => g > 0);
        if (!valid.length) return 0;
        return Math.round(valid.reduce((s, g) => s + g, 0) / valid.length * 10) / 10;
    });

    totalPendingHomework = computed(() => {
        const today = new Date().toISOString().slice(0, 10);
        let count = 0;
        for (const items of Object.values(this.state.homeworkMap())) {
            count += items.filter(h => h.due_date >= today).length;
        }
        return count;
    });

    totalTodayClasses = computed(() => {
        const todayDay = new Date().getDay();
        let count = 0;
        for (const items of Object.values(this.state.timetableMap())) {
            count += items.filter(e => e.day_of_week === todayDay).length;
        }
        return count;
    });

    pendingAbsences = computed(() => {
        return this.state.absenceRequests().filter(a => a.status === 'PENDING').length;
    });

    activeBookings = computed(() => {
        return this.state.bookings().length;
    });
}
