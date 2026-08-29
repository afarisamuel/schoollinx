import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherSubnavComponent } from '../../teacher-subnav/teacher-subnav.component';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-sickbay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherSubnavComponent],
  templateUrl: './teacher-sickbay.component.html'
})
export class TeacherSickbayComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  selectedAssignment = signal<any>(null);
  students = signal<any[]>([]);
  referrals = signal<any[]>([]);

  referralStudentId = signal('');
  referralSymptoms = signal('');
  referralSeverity = signal('NORMAL');
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
        if (res.assignments?.length > 0) {
          const first = this.selectedAssignment() || res.assignments[0];
          this.selectAssignment(first);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  selectAssignment(assignment: any) {
    this.selectedAssignment.set(assignment);
    this.isLoading.set(true);

    this.portalService.getClassStudents(assignment.class_id).subscribe({
      next: (sts) => {
        this.students.set(sts || []);
        if (sts?.length > 0) {
          this.referralStudentId.set(sts[0].id);
        }
      },
      error: () => {}
    });

    this.portalService.getClassReferrals(assignment.class_id).subscribe({
      next: (refs) => {
        this.referrals.set(refs || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  sendTicket() {
    if (!this.referralStudentId() || !this.referralSymptoms()) {
      this.toast.error('Select student and describe symptoms.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      student_id: this.referralStudentId(),
      symptoms: this.referralSymptoms(),
      severity: this.referralSeverity(),
      referral_time: new Date().toISOString()
    };

    this.portalService.createSickbayReferral(payload).subscribe({
      next: (ref) => {
        this.isSubmitting.set(false);
        this.referralSymptoms.set('');
        this.referrals.update(list => [ref, ...list]);
        this.toast.success('Referral ticket dispatched to infirmary nurse.', 'Ticket Created');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to create sickbay referral.');
      }
    });
  }
}
