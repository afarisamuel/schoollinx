import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherSubnavComponent } from '../../teacher-subnav/teacher-subnav.component';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-hr-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherSubnavComponent],
  templateUrl: './teacher-hr-vault.component.html'
})
export class TeacherHrVaultComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);

  // Leave Management (Feature 40)
  leaveType = signal('CASUAL');
  leaveStart = signal(new Date().toISOString().slice(0, 10));
  leaveEnd = signal(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  leaveReason = signal('');
  isSubmittingLeave = signal(false);

  // Mock archived payslips (Feature 41)
  payslips = signal([
    { month: 'August 2026', gross: 4200, ssnit: 231, tax: 480, net: 3489, status: 'PAID' },
    { month: 'July 2026', gross: 4200, ssnit: 231, tax: 480, net: 3489, status: 'PAID' },
    { month: 'June 2026', gross: 4200, ssnit: 231, tax: 480, net: 3489, status: 'PAID' }
  ]);

  ngOnInit() {
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  submitLeave() {
    if (!this.leaveReason()) {
      this.toast.error('Please specify the reason for the leave application.');
      return;
    }

    this.isSubmittingLeave.set(true);
    setTimeout(() => {
      this.isSubmittingLeave.set(false);
      this.leaveReason.set('');
      this.toast.success('Leave application submitted to School Administration for review.', 'Application Filed');
    }, 600);
  }

  downloadPayslip(month: string) {
    this.toast.info(`Generating official PDF payslip for ${month}...`, 'Download Started');
  }
}
