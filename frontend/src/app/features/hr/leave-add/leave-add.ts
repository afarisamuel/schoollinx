import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { LeaveRequest, StaffProfile } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-leave-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './leave-add.html',
})
export class LeaveAdd implements OnInit {
  private hrService = inject(HrService);
  private router = inject(Router);

  isSaving = signal(false);
  staffProfiles = signal<StaffProfile[]>([]);

  leaveTypes = ['Annual Leave', 'Sick Leave', 'Maternity/Paternity', 'Unpaid Leave', 'Other'];

  form = signal<Partial<LeaveRequest>>({
    staff_id: '',
    leave_type: 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: '',
  });

  ngOnInit(): void {
    this.hrService.getStaffProfiles().subscribe({
      next: (res) => this.staffProfiles.set(res || []),
      error: (err) => console.error('Failed to fetch staff', err)
    });
  }

  submitLeave(event: Event): void {
    event.preventDefault();
    this.isSaving.set(true);
    this.hrService.submitLeaveRequest(this.form()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/hr/leave']);
      },
      error: (err) => {
        console.error('Error submitting leave request', err);
        this.isSaving.set(false);
      }
    });
  }

  updateForm(field: keyof LeaveRequest, value: any): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }
}
