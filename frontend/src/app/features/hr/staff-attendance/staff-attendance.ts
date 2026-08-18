import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffAttendance as AttendanceLog, StaffProfile } from '../../../core/domain/hr/hr.model';

@Component({
    selector: 'app-staff-attendance',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './staff-attendance.html',
})
export class StaffAttendancePage implements OnInit {
    private hrService = inject(HrService);

    // Data
    logs = signal<AttendanceLog[]>([]);
    staffList = signal<StaffProfile[]>([]);
    isLoading = signal(false);

    // Filters
    startDate = this.getDateString(new Date(new Date().setDate(new Date().getDate() - 6)));
    endDate   = this.getDateString(new Date());
    selectedStaffId = '';

    // Clock-in/out panel
    clockStaffId = '';
    clockMessage = '';
    clockError = '';

    // Summary stats
    totalPresent = computed(() => this.logs().filter(l => l.status === 'PRESENT').length);
    totalLate    = computed(() => this.logs().filter(l => l.status === 'LATE').length);
    totalAbsent  = computed(() => this.logs().filter(l => l.status === 'ABSENT').length);

    ngOnInit() {
        this.loadStaff();
        this.loadLogs();
    }

    loadStaff() {
        this.hrService.getStaffProfiles().subscribe({
            next: (res) => this.staffList.set(res || []),
            error: () => {}
        });
    }

    loadLogs() {
        this.isLoading.set(true);
        const call = this.selectedStaffId
            ? this.hrService.getStaffAttendanceLogs(this.selectedStaffId, this.startDate, this.endDate)
            : this.hrService.getAttendanceLogs(this.startDate, this.endDate);

        call.subscribe({
            next: (res) => { this.logs.set(res || []); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
    }

    clockIn() {
        if (!this.clockStaffId) { this.clockError = 'Please select a staff member.'; return; }
        this.clockMessage = '';
        this.clockError = '';
        this.hrService.clockIn(this.clockStaffId).subscribe({
            next: (rec) => {
                this.clockMessage = `✔ Clocked in at ${new Date(rec.clock_in!).toLocaleTimeString()}`;
                this.loadLogs();
            },
            error: (e) => this.clockError = e.error?.error || 'Clock-in failed.'
        });
    }

    clockOut() {
        if (!this.clockStaffId) { this.clockError = 'Please select a staff member.'; return; }
        this.clockMessage = '';
        this.clockError = '';
        this.hrService.clockOut(this.clockStaffId).subscribe({
            next: (rec) => {
                this.clockMessage = `✔ Clocked out at ${new Date(rec.clock_out!).toLocaleTimeString()}`;
                this.loadLogs();
            },
            error: (e) => this.clockError = e.error?.error || 'Clock-out failed.'
        });
    }

    getStatusClass(status: string) {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'LATE':    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'ABSENT':  return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default:        return 'bg-bg-tertiary text-text-muted border-border-primary';
        }
    }

    private getDateString(d: Date): string {
        return d.toISOString().split('T')[0];
    }

    formatTime(t?: string): string {
        if (!t) return '—';
        return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getDuration(clockIn?: string, clockOut?: string): string {
        if (!clockIn || !clockOut) return '—';
        const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 1000 / 60;
        const h = Math.floor(diff / 60);
        const m = Math.round(diff % 60);
        return `${h}h ${m}m`;
    }
}
