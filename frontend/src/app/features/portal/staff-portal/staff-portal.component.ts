import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { StaffProfile, LeaveRequest, PayrollRecord, StaffAttendance } from '../../../core/domain/hr/hr.model';

@Component({
    selector: 'app-staff-portal',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './staff-portal.component.html',
    styles: []
})
export class StaffPortalComponent implements OnInit {
    private hrService = inject(HrService);
    private authService = inject(AuthService);

    profile = signal<StaffProfile | null>(null);
    myLeaves = signal<LeaveRequest[]>([]);
    recentPayslips = signal<{ id: string; month: string; raw: PayrollRecord }[]>([]);
    todayAttendance = signal<StaffAttendance | null>(null);

    isClocking = signal<boolean>(false);
    clockMessage = signal<string>('');
    clockError = signal<string>('');

    ngOnInit(): void {
        const user = this.authService.currentUserValue;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const todayStr = new Date().toISOString().slice(0, 10);

        this.hrService.getStaffProfiles().subscribe(profiles => {
            const me = profiles.find(p => p.user_id === user?.id || (user?.email && p.email === user.email));
            const target = me || (profiles.length > 0 ? profiles[0] : null);
            if (target) {
                this.profile.set(target);
                this.loadStaffRecords(target.id, currentMonth, currentYear, monthNames);
                this.loadTodayAttendance(target.id, todayStr);
            }
        });

        this.hrService.getLeaveRequests().subscribe(leaves => {
            if (this.profile()) {
                this.myLeaves.set(leaves.filter(l => l.staff_id === this.profile()?.id).slice(0, 3));
            } else {
                this.myLeaves.set(leaves.slice(0, 3)); 
            }
        });
    }

    private loadTodayAttendance(staffId: string, todayStr: string) {
        this.hrService.getStaffAttendanceLogs(staffId, todayStr, todayStr).subscribe({
            next: (logs) => {
                if (logs && logs.length > 0) {
                    this.todayAttendance.set(logs[0]);
                } else {
                    this.todayAttendance.set(null);
                }
            },
            error: () => this.todayAttendance.set(null)
        });
    }

    private loadStaffRecords(staffId: string, currentMonth: number, currentYear: number, monthNames: string[]) {
        this.hrService.getPayrollHistory(currentMonth, currentYear).subscribe({
            next: (payrolls) => {
                const staffPayrolls = payrolls.filter(p => p.staff_id === staffId);
                const mapped = staffPayrolls.map(p => ({
                    id: p.id,
                    month: `${monthNames[p.period_month - 1] || 'Month ' + p.period_month} ${p.period_year}`,
                    raw: p
                }));
                this.recentPayslips.set(mapped);
            },
            error: () => {
                this.recentPayslips.set([]);
            }
        });
    }

    clockIn() {
        const prof = this.profile();
        if (!prof) return;
        this.isClocking.set(true);
        this.clockMessage.set('');
        this.clockError.set('');

        this.hrService.clockIn(prof.id).subscribe({
            next: (rec) => {
                this.isClocking.set(false);
                this.todayAttendance.set(rec);
                const timeStr = rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
                this.clockMessage.set(`Successfully Clocked In at ${timeStr}`);
                setTimeout(() => this.clockMessage.set(''), 4000);
            },
            error: (e) => {
                this.isClocking.set(false);
                this.clockError.set(e.error?.error || 'Clock-in failed.');
                setTimeout(() => this.clockError.set(''), 4000);
            }
        });
    }

    clockOut() {
        const prof = this.profile();
        if (!prof) return;
        this.isClocking.set(true);
        this.clockMessage.set('');
        this.clockError.set('');

        this.hrService.clockOut(prof.id).subscribe({
            next: (rec) => {
                this.isClocking.set(false);
                this.todayAttendance.set(rec);
                const timeStr = rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
                this.clockMessage.set(`Successfully Clocked Out at ${timeStr}`);
                setTimeout(() => this.clockMessage.set(''), 4000);
            },
            error: (e) => {
                this.isClocking.set(false);
                this.clockError.set(e.error?.error || 'Clock-out failed.');
                setTimeout(() => this.clockError.set(''), 4000);
            }
        });
    }

    downloadPayslip(id: string) {
        this.hrService.downloadPayslip(id);
    }
}
