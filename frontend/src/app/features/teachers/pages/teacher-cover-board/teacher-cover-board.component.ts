import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherSubnavComponent } from '../../teacher-subnav/teacher-subnav.component';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-cover-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherSubnavComponent],
  templateUrl: './teacher-cover-board.component.html'
})
export class TeacherCoverBoardComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  coverRequests = signal<any[]>([]);
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  selectedAssignment = signal<any>(null);

  newCoverDate = signal(new Date().toISOString().slice(0, 10));
  newCoverPeriod = signal(1);
  newCoverReason = signal('');
  newCoverHandover = signal('');
  isSubmitting = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        this.assignments.set(res.assignments || []);
        if (res.assignments?.length > 0 && !this.selectedAssignment()) {
          this.selectedAssignment.set(res.assignments[0]);
        }
        this.loadRequests();
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadRequests() {
    this.portalService.getCoverRequests().subscribe({
      next: (reqs) => {
        this.coverRequests.set(reqs || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  submitRequest() {
    const teacher = this.teacher();
    const assignment = this.selectedAssignment();
    if (!teacher) {
      this.toast.error('Teacher profile not found.');
      return;
    }
    if (!assignment) {
      this.toast.error('Please select an assigned class for the cover request.');
      return;
    }
    if (!this.newCoverReason()) {
      this.toast.error('Please enter a reason for the absence/cover request.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      requester_id: teacher.id,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id || assignment.subject?.id,
      cover_date: this.newCoverDate(),
      period_number: Number(this.newCoverPeriod()),
      reason: this.newCoverReason(),
      handover_notes: this.newCoverHandover()
    };

    this.portalService.createCoverRequest(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.newCoverReason.set('');
        this.newCoverHandover.set('');
        this.toast.success('Cover request posted to faculty board.', 'Cover Requested');
        this.loadRequests();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to post cover request.');
      }
    });
  }

  claimCover(req: any) {
    const teacherId = this.teacher()?.id;
    if (!teacherId) return;
    this.portalService.claimCoverRequest(req.id, teacherId).subscribe({
      next: () => {
        this.toast.success('You have successfully volunteered to cover this period!', 'Period Claimed');
        this.loadRequests();
      },
      error: () => this.toast.error('Failed to claim period cover.')
    });
  }
}
