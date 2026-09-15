import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { HomeworkItem, TimetableEntry } from '../../../core/infrastructure/parent/parent-portal.service';

@Component({
    selector: 'app-parent-overview',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './parent-overview.page.html',
    styleUrl: './parent-overview.page.css'
})
export class ParentOverviewPage {
    state = inject(ParentStateService);
    isSyncing = signal(false);

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

    pendingHomeworkList = computed(() => {
        const today = new Date().toISOString().slice(0, 10);
        const list: Array<HomeworkItem & { studentName?: string; studentId?: string }> = [];
        const students = this.state.profile()?.students || [];
        const hwMap = this.state.homeworkMap();

        for (const s of students) {
            const items = hwMap[s.id || ''] || [];
            for (const h of items) {
                if (h.due_date >= today) {
                    list.push({ ...h, studentName: s.first_name, studentId: s.id });
                }
            }
        }
        return list.slice(0, 4);
    });

    totalTodayClasses = computed(() => {
        const todayDay = new Date().getDay();
        let count = 0;
        for (const items of Object.values(this.state.timetableMap())) {
            count += items.filter(e => e.day_of_week === todayDay).length;
        }
        return count;
    });

    todayScheduleList = computed(() => {
        const todayDay = new Date().getDay();
        const list: Array<TimetableEntry & { studentName?: string }> = [];
        const students = this.state.profile()?.students || [];
        const ttMap = this.state.timetableMap();

        for (const s of students) {
            const items = ttMap[s.id || ''] || [];
            for (const t of items) {
                if (t.day_of_week === todayDay) {
                    list.push({ ...t, studentName: s.first_name });
                }
            }
        }
        return list.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).slice(0, 5);
    });

    pendingAbsences = computed(() => {
        return this.state.absenceRequests().filter(a => a.status === 'PENDING').length;
    });

    activeBookings = computed(() => {
        return this.state.bookings().length;
    });

    getWardAttendance(studentId?: string) {
        if (!studentId) return { percentage: 0, present: 0, absent: 0, late: 0, total_days: 0 };
        return this.state.attendanceMap()[studentId] || { percentage: 0, present: 0, absent: 0, late: 0, total_days: 0 };
    }

    getWardGpa(studentId?: string): number {
        if (!studentId) return 0;
        return this.state.gpaMap()[studentId] || 0;
    }

    getWardHomeworkCount(studentId?: string): number {
        if (!studentId) return 0;
        const today = new Date().toISOString().slice(0, 10);
        const hw = this.state.homeworkMap()[studentId] || [];
        return hw.filter(h => h.due_date >= today).length;
    }

    syncData() {
        this.isSyncing.set(true);
        this.state.initialized = false;
        this.state.bootstrap();
        setTimeout(() => this.isSyncing.set(false), 800);
    }
}
