import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { StaffProfile, LeaveRequest } from '../../../core/domain/hr/hr.model';

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
    
    // Quick mock for UI since real timetable/classes endpoints might be teacher specific
    recentPayslips = [
        { month: 'August 2026', id: 'ps-001' },
        { month: 'July 2026', id: 'ps-002' }
    ];

    ngOnInit(): void {
        const user = this.authService.currentUserValue;
        // Assume backend allows filtering staff profiles by user ID
        this.hrService.getStaffProfiles().subscribe(profiles => {
            const me = profiles.find(p => p.user_id === user?.id);
            if (me) {
                this.profile.set(me);
            } else if (profiles.length > 0) {
                // Fallback for testing if no exact match
                this.profile.set(profiles[0]);
            }
        });

        this.hrService.getLeaveRequests().subscribe(leaves => {
            // In a real app, filter by the logged-in staff member ID
            this.myLeaves.set(leaves.slice(0, 3)); 
        });
    }

    downloadPayslip(id: string) {
        this.hrService.downloadPayslip(id);
    }
}
