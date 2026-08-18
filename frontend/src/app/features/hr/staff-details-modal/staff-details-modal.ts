import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffProfile, LeaveBalance, PerformanceReview, StaffAttendance } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-staff-details-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './staff-details-modal.html'
})
export class StaffDetailsModalComponent implements OnInit {
  @Input({ required: true }) staff!: StaffProfile;
  @Output() close = new EventEmitter<void>();

  private hrService = inject(HrService);

  activeTab = signal<'overview' | 'attendance' | 'leave' | 'performance'>('overview');
  
  leaveBalances = signal<LeaveBalance[]>([]);
  performanceReviews = signal<PerformanceReview[]>([]);
  attendanceLogs = signal<StaffAttendance[]>([]);
  
  isLoading = signal(true);

  ngOnInit() {
    this.loadDetails();
  }

  loadDetails() {
    this.isLoading.set(true);
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Format YYYY-MM-DD
    const endStr = today.toISOString().split('T')[0];
    const startStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Load leave balances
    this.hrService.getStaffLeaveBalances(this.staff.id).subscribe(res => {
        if (res) this.leaveBalances.set(res);
    });

    // Load performance reviews
    this.hrService.getStaffPerformanceReviews(this.staff.id).subscribe(res => {
        if (res) this.performanceReviews.set(res);
    });

    // Load attendance
    this.hrService.getStaffAttendanceLogs(this.staff.id, startStr, endStr).subscribe(res => {
        if (res) this.attendanceLogs.set(res);
        this.isLoading.set(false);
    });
  }

  closeModal() {
    this.close.emit();
  }
}
