import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffProfile, PayrollRecord, LeaveRequest } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboard implements OnInit {
  private hrService = inject(HrService);
  
  staffList = signal<StaffProfile[]>([]);
  payrollRecords = signal<PayrollRecord[]>([]);
  leaveRequests = signal<LeaveRequest[]>([]);

  totalPayrollAmount = computed(() => {
    return this.payrollRecords().reduce((sum, record) => sum + record.gross_pay, 0);
  });

  paidPayrollSum = computed(() => {
    return this.payrollRecords().filter(r => r.status === 'PAID').reduce((sum, record) => sum + record.gross_pay, 0);
  });

  pendingLeaves = computed(() => {
    return this.leaveRequests().filter(l => l.status === 'PENDING').length;
  });

  ngOnInit(): void {
    this.hrService.getStaffProfiles().subscribe(res => this.staffList.set(res || []));
    
    const now = new Date();
    this.hrService.getPayrollHistory(now.getMonth() + 1, now.getFullYear())
      .subscribe(res => this.payrollRecords.set(res || []));

    this.hrService.getLeaveRequests().subscribe(res => this.leaveRequests.set(res || []));
  }
}
