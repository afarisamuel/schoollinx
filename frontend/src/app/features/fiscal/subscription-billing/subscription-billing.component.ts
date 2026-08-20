import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TenantProfile, TenantProfileService, TenantSubscriptionPayment } from '../../../core/infrastructure/tenant-profile.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';

@Component({
  selector: 'app-subscription-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-billing.component.html'
})
export class SubscriptionBillingComponent implements OnInit {
  private tenantProfileService = inject(TenantProfileService);
  private dialog = inject(DialogService);
  private http = inject(HttpClient);
  private studentService = inject(StudentService);

  tenantProfile = signal<TenantProfile | null>(null);
  loading = signal(true);
  isPaymentLoading = signal(false);

  // Student count
  activeStudentCount = signal(0);
  loadingStudents = signal(true);

  // Payment history
  history = signal<TenantSubscriptionPayment[]>([]);
  loadingHistory = signal(false);

  // Payment modal
  showPayModal = signal(false);
  payerEmail = signal('');

  // Term payment status (derived from history + billing_due_date)
  termPaymentStatus = computed<'PAID' | 'PENDING' | 'OVERDUE'>(() => {
    const profile = this.tenantProfile();
    const entries = this.history();
    // If there's a PENDING payment, show pending
    if (entries.some(e => e.status === 'PENDING')) return 'PENDING';
    // If billing_due_date exists and is in the future, we're paid
    if (profile?.billing_due_date) {
      const due = new Date(profile.billing_due_date);
      if (due > new Date()) return 'PAID';
    }
    return 'OVERDUE';
  });

  latestPayment = computed(() => {
    const entries = this.history();
    return entries.find(e => e.status === 'SUCCESS' || e.status === 'PAID') ?? null;
  });

  // Payment Config
  paystackPublicKey = signal('');
  paystackSecretKey = signal('');
  isSavingConfig = signal(false);
  configSaved = signal(false);
  hasConfigured = signal(false);

  ngOnInit() {
    this.loadTenantProfile();
    this.loadStudentCount();
    this.loadHistory();
  }

  loadHistory() {
    this.loadingHistory.set(true);
    this.tenantProfileService.getSubscriptionHistory().subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => {
        this.loadingHistory.set(false);
      }
    });
  }

  loadTenantProfile() {
    this.loading.set(true);
    this.tenantProfileService.getProfile().subscribe({
      next: (profile) => {
        this.tenantProfile.set(profile);
        if (profile.paystack_public_key) {
          this.paystackPublicKey.set(profile.paystack_public_key);
          this.hasConfigured.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        console.warn('Could not load tenant profile');
        this.loading.set(false);
      }
    });
  }

  loadStudentCount() {
    this.loadingStudents.set(true);
    this.studentService.getStudentsPaginated(1, 1).subscribe({
      next: (res) => {
        this.activeStudentCount.set(res.meta?.total_count ?? 0);
        this.loadingStudents.set(false);
      },
      error: () => {
        this.loadingStudents.set(false);
      }
    });
  }

  handleUpgrade() {
    const profile = this.tenantProfile();
    if (!profile) return;

    if (!profile.per_student_per_term_rate || profile.per_student_per_term_rate <= 0) {
      this.dialog.alert(
        'Your subscription rate has not been configured yet. Please contact support to set up billing.',
        'Rate Not Configured',
        'warning'
      );
      return;
    }

    if (this.activeStudentCount() <= 0) {
      this.dialog.alert(
        'No active students found in the system. Enroll students before paying your subscription.',
        'No Students Found',
        'warning'
      );
      return;
    }

    this.payerEmail.set('');
    this.showPayModal.set(true);
  }

  closePayModal() {
    this.showPayModal.set(false);
    this.payerEmail.set('');
  }

  confirmPayment() {
    const profile = this.tenantProfile();
    if (!profile) return;

    const email = this.payerEmail().trim();
    if (!email || !email.includes('@')) {
      this.dialog.alert('Please enter a valid billing email address.', 'Invalid Email', 'warning');
      return;
    }

    this.showPayModal.set(false);
    this.initiatePayment(profile.id, email, this.activeStudentCount());
  }

  initiatePayment(tenantId: string, payerEmail: string, studentCount: number) {
    this.isPaymentLoading.set(true);
    this.http.post<{ authorization_url: string; reference: string }>(
      `/api/tenant/subscription/pay`,
      { payer_email: payerEmail, student_count: studentCount }
    ).subscribe({
      next: (res) => {
        this.isPaymentLoading.set(false);
        window.open(res.authorization_url, '_blank');
        this.dialog.alert('We are waiting for you to complete the payment in the new tab. Please do not close this window.', 'Payment Started', 'info');
        this.loadHistory(); // Reload to show the pending payment
        this.pollVerification(res.reference);
      },
      error: (err) => {
        this.isPaymentLoading.set(false);
        const msg = err.error?.error || 'Failed to initialize payment.';
        this.dialog.alert(msg, 'Payment Error', 'danger');
      }
    });
  }

  pollVerification(reference: string, attempts = 0) {
    if (attempts > 30) {
      this.dialog.alert('Payment verification timed out. Please click "Verify" manually in the history table when you have completed payment.', 'Timeout', 'warning');
      return;
    }
    
    // Poll every 5 seconds
    setTimeout(() => {
      this.http.post(`/api/tenant/subscription/verify/${reference}`, {}).subscribe({
        next: () => {
          this.dialog.alert('Payment completed and verified successfully!', 'Success', 'success');
          this.loadHistory();
          this.loadTenantProfile(); // update billing due date
        },
        error: (err) => {
          // If 400 with "payment not successful yet", we keep polling
          const msg = err.error?.error || '';
          if (msg.includes('success') === false) {
             this.pollVerification(reference, attempts + 1);
          } else {
             // Other error
             this.dialog.alert('Verification failed. You can try verifying manually from the table.', 'Verification Error', 'danger');
          }
        }
      });
    }, 5000);
  }

  verifyPayment(reference: string) {
    this.http.post(`/api/tenant/subscription/verify/${reference}`, {}).subscribe({
      next: () => {
        this.dialog.alert('Payment verified successfully!', 'Success', 'success');
        this.loadHistory();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to verify payment.';
        this.dialog.alert(msg, 'Verification Error', 'danger');
      }
    });
  }

  get totalDue(): number {
    const profile = this.tenantProfile();
    if (!profile) return 0;
    return this.activeStudentCount() * (profile.per_student_per_term_rate || 0);
  }

  handleBuyCredits() {
    this.dialog.alert('SMS credit purchasing portal will be available soon.', 'Purchase SMS Credits', 'info');
  }

  handleStorageUpgrade() {
    this.dialog.alert('Storage expansion options will be available soon.', 'Expand Storage', 'info');
  }

  savePaymentConfig() {
    const pub = this.paystackPublicKey().trim();
    const sec = this.paystackSecretKey().trim();

    if (!pub || !sec) {
      this.dialog.alert('Please provide both your Paystack Public Key and Secret Key.', 'Missing Keys', 'warning');
      return;
    }

    this.isSavingConfig.set(true);
    this.tenantProfileService.updatePaymentConfig(pub, sec).subscribe({
      next: () => {
        this.isSavingConfig.set(false);
        this.configSaved.set(true);
        this.hasConfigured.set(true);
        this.paystackSecretKey.set(''); // clear secret from memory
        setTimeout(() => this.configSaved.set(false), 4000);
      },
      error: (err) => {
        this.isSavingConfig.set(false);
        const msg = err.error?.error || 'Failed to save payment configuration.';
        this.dialog.alert(msg, 'Save Error', 'danger');
      }
    });
  }
}
