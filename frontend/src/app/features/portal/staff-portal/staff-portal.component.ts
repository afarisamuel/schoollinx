import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { StaffProfile, LeaveRequest, PayrollRecord } from '../../../core/domain/hr/hr.model';

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

    ngOnInit(): void {
        const user = this.authService.currentUserValue;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.hrService.getStaffProfiles().subscribe(profiles => {
            const me = profiles.find(p => p.user_id === user?.id);
            if (me) {
                this.profile.set(me);
                this.loadStaffRecords(me.id, currentMonth, currentYear, monthNames);
            } else if (profiles.length > 0) {
                this.profile.set(profiles[0]);
                this.loadStaffRecords(profiles[0].id, currentMonth, currentYear, monthNames);
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

    downloadPayslip(id: string) {
        this.hrService.downloadPayslip(id);
    }
}
