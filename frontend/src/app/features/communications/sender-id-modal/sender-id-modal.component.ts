import { Component, OnInit, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmsService, SMSOverview } from '../../../core/infrastructure/sms/sms.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-sender-id-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sender-id-modal.component.html'
})
export class SenderIdModalComponent implements OnInit {
  private smsService = inject(SmsService);
  private toast = inject(ToastService);

  close = output<void>();
  requestSubmitted = output<void>();

  overview = signal<SMSOverview | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);

  senderIdInput = signal('');
  purposeInput = signal('');

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    this.isLoading.set(true);
    this.smsService.getOverview().subscribe({
      next: (ov) => {
        this.overview.set(ov);
        if (ov.sms_sender_id) {
          this.senderIdInput.set(ov.sms_sender_id);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  submitRequest() {
    const rawId = this.senderIdInput().trim().toUpperCase();
    if (!rawId || rawId.length < 2 || rawId.length > 11) {
      this.toast.error('Sender ID must be between 2 and 11 alphanumeric characters.', 'Invalid Sender ID');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(rawId)) {
      this.toast.error('Sender ID can only contain letters and numbers (no spaces or special symbols).', 'Invalid Format');
      return;
    }

    this.isSubmitting.set(true);
    this.smsService.requestSenderID(rawId, this.purposeInput()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(
          `Sender ID "${rawId}" submitted for verification. Super Admin will review it shortly.`,
          'Request Submitted'
        );
        this.requestSubmitted.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.error || 'Failed to submit Sender ID request.');
      }
    });
  }
}
