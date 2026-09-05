import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { LeaveRequest } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-leave-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leave-manager.html',
  styleUrls: ['./leave-manager.css']
})
export class LeaveManager implements OnInit {
  private hrService = inject(HrService);
  
  leaveRequests = signal<LeaveRequest[]>([]);
  viewMode = signal<'LIST' | 'CALENDAR'>('LIST');

  searchTerm = signal<string>('');
  selectedType = signal<string>('');

  leaveTypes = computed(() => {
    const types = new Set(this.leaveRequests().map(r => r.leave_type).filter(Boolean));
    return Array.from(types);
  });

  filteredLeaveRequests = computed(() => {
    let result = [...this.leaveRequests()];
    const type = this.selectedType();
    if (type) {
      result = result.filter(r => r.leave_type === type);
    }
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(r => {
        const name = `${r.staff?.first_name || ''} ${r.staff?.last_name || ''}`.toLowerCase();
        const role = `${r.staff?.job_title || ''}`.toLowerCase();
        const leaveType = `${r.leave_type || ''}`.toLowerCase();
        return name.includes(term) || role.includes(term) || leaveType.includes(term);
      });
    }
    return result;
  });

  approvedCount = computed(() => {
    return this.leaveRequests().filter(l => l.status === 'APPROVED').length;
  });

  rejectedCount = computed(() => {
    return this.leaveRequests().filter(l => l.status === 'REJECTED').length;
  });

  // Calendar State
  currentDate = signal(new Date());

  calendarDays = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start grid on Sunday
    const startOffset = firstDay.getDay();
    
    const days = [];
    // Previous month filler
    for (let i = 0; i < startOffset; i++) {
        days.push({ date: new Date(year, month, -startOffset + i + 1), isCurrentMonth: false, requests: [] as LeaveRequest[] });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i);
        // Find requests overlapping this day
        const dayReqs = this.leaveRequests().filter(r => {
            if (r.status !== 'APPROVED') return false;
            const start = new Date(r.start_date);
            const end = new Date(r.end_date);
            // Ignore time portion for comparison
            const compareD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const compareStart = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
            const compareEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
            return compareD >= compareStart && compareD <= compareEnd;
        });
        days.push({ date: d, isCurrentMonth: true, requests: dayReqs });
    }
    
    // Next month filler
    const endOffset = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= endOffset; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, requests: [] as LeaveRequest[] });
    }
    
    return days;
  });

  prevMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  
  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  ngOnInit(): void {
    this.loadLeaves();
  }

  // --- Modal State ---
  isConfirmModalOpen = false;
  isProcessing = false;
  pendingAction: { id: string, status: 'APPROVED' | 'REJECTED' } | null = null;

  loadLeaves(): void {
    this.hrService.getLeaveRequests().subscribe({
      next: (res) => { this.leaveRequests.set(res || []); },
      error: (err) => console.error('Error loading leaves', err)
    });
  }

  openConfirmModal(id: string, status: 'APPROVED' | 'REJECTED'): void {
    this.pendingAction = { id, status };
    this.isConfirmModalOpen = true;
  }

  closeConfirmModal(): void {
    this.isConfirmModalOpen = false;
    this.pendingAction = null;
  }

  confirmAction(): void {
    if (!this.pendingAction) return;
    this.isProcessing = true;
    this.hrService.updateLeaveStatus(this.pendingAction.id, this.pendingAction.status).subscribe({
      next: () => {
        this.isProcessing = false;
        this.closeConfirmModal();
        this.loadLeaves();
      },
      error: (err) => {
        console.error('Error updating leave status', err);
        this.isProcessing = false;
        this.closeConfirmModal();
      }
    });
  }

  pendingCount = computed(() => {
    return this.leaveRequests().filter(l => l.status === 'PENDING').length;
  });
}
