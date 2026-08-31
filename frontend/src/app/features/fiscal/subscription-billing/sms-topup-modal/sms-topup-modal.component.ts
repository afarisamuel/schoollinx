import { Component, OnInit, signal, computed, output, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmsService, SMSOverview, SMSPricing } from '../../../../core/infrastructure/sms/sms.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-sms-topup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sms-topup-modal.component.html'
})
export class SmsTopUpModalComponent implements OnInit {
  private smsService = inject(SmsService);
  private toast = inject(ToastService);

  @Input() initialBalance = 0;
  close = output<void>();
  topupCompleted = output<number>();

  overview = signal<SMSOverview | null>(null);
  pricing = signal<SMSPricing | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);

  // Selected preset or custom
  selectedAmount = signal<number>(50);
  isCustom = signal<boolean>(false);
  customAmount = signal<number>(50);
  payerEmail = signal<string>('');

  costPerSms = computed(() => {
    return this.overview()?.cost_per_sms || this.pricing()?.cost_per_sms || 0.05;
  });

  effectiveAmount = computed(() => {
    return this.isCustom() ? this.customAmount() : this.selectedAmount();
  });

  calculatedCredits = computed(() => {
    const amt = this.effectiveAmount();
    const rate = this.costPerSms();
    if (amt <= 0 || rate <= 0) return 0;
    return Math.floor(amt / rate);
  });

  presetBundles = [
    { amount: 20, label: 'Starter Pack', badge: 'Popular' },
    { amount: 50, label: 'Term Essential', badge: 'Best Value' },
    { amount: 100, label: 'Campus Pro', badge: 'Bulk' },
    { amount: 200, label: 'Institution Plus', badge: 'High Volume' },
    { amount: 500, label: 'Enterprise Suite', badge: 'Maximum' }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.smsService.getOverview().subscribe({
      next: (ov) => {
        this.overview.set(ov);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.smsService.getPricing().subscribe({
      next: (p) => {
        this.pricing.set(p);
      }
    });
  }

  selectPreset(amt: number) {
    this.isCustom.set(false);
    this.selectedAmount.set(amt);
  }

  enableCustom() {
    this.isCustom.set(true);
  }

  handleTopUp() {
    const amount = this.effectiveAmount();
    if (!amount || amount <= 0) {
      this.toast.error('Please specify a valid top-up amount in GHS.');
      return;
    }

    this.isSubmitting.set(true);
    this.smsService.initializeTopUp(amount, this.payerEmail()).subscribe({
      next: (res) => {
        // In local/test mode, auto-verify for instant simulation or open Paystack
        this.smsService.verifyTopUp(res.reference).subscribe({
          next: (verifyRes) => {
            this.isSubmitting.set(false);
            this.toast.success(
              `Successfully added ${verifyRes.credits_added} SMS credits to your account!`,
              'Top-Up Successful'
            );
            this.topupCompleted.emit(verifyRes.total_sms_credits);
            this.close.emit();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toast.success(`Top-Up of ₵${amount} initiated (Ref: ${res.reference})`, 'Payment Initiated');
            this.close.emit();
          }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.error || 'Failed to initialize top-up payment.');
      }
    });
  }
}
