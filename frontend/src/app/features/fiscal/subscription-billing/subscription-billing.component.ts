import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { 
  TenantProfile, 
  TenantProfileService, 
  TenantSubscriptionPayment,
  PaystackCountry,
  PaystackBank,
  PaystackResolvedAccount,
  TenantSubaccountConfig
} from '../../../core/infrastructure/tenant-profile.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';

import { ToastService } from '../../../shared/ui/toast/toast.service';
import { SmsTopUpModalComponent } from './sms-topup-modal/sms-topup-modal.component';
import { SenderIdModalComponent } from '../../communications/sender-id-modal/sender-id-modal.component';

@Component({
  selector: 'app-subscription-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, SmsTopUpModalComponent, SenderIdModalComponent],
  templateUrl: './subscription-billing.component.html'
})
export class SubscriptionBillingComponent implements OnInit {
  private tenantProfileService = inject(TenantProfileService);
  private dialog = inject(DialogService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private studentService = inject(StudentService);

  showSmsTopUpModal = signal(false);
  showSenderIdModal = signal(false);

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

  // Gateway Mode
  gatewayMode = signal<'subaccount' | 'keys'>('subaccount');

  // Subaccount Configuration
  subaccountConfig = signal<TenantSubaccountConfig | null>(null);
  loadingSubaccount = signal(false);
  isUnlinking = signal(false);

  // Subaccount Setup Wizard
  countries = signal<PaystackCountry[]>([]);
  selectedCountry = signal<string>('ghana');
  banks = signal<PaystackBank[]>([]);
  loadingBanks = signal(false);
  bankSearchTerm = signal('');
  selectedBankCode = signal('');
  accountNumber = signal('');
  businessName = signal('');
  
  isResolving = signal(false);
  resolvedAccount = signal<PaystackResolvedAccount | null>(null);
  resolveError = signal('');
  isCreatingSubaccount = signal(false);
  subaccountCreatedSuccess = signal(false);

  // Filtered Banks
  filteredBanks = computed(() => {
    const term = this.bankSearchTerm().toLowerCase().trim();
    const list = this.banks();
    if (!term) return list;
    return list.filter(b => b.name.toLowerCase().includes(term) || b.code.includes(term));
  });

  // Selected Bank Object
  selectedBank = computed(() => {
    const code = this.selectedBankCode();
    return this.banks().find(b => b.code === code) ?? null;
  });

  // Custom Keys Config
  paystackPublicKey = signal('');
  paystackSecretKey = signal('');
  isSavingConfig = signal(false);
  configSaved = signal(false);
  hasConfigured = signal(false);

  ngOnInit() {
    this.loadTenantProfile();
    this.loadStudentCount();
    this.loadHistory();
    this.loadSubaccountConfig();
    this.loadCountries();
    this.loadBanks('ghana');
  }

  loadSubaccountConfig() {
    this.loadingSubaccount.set(true);
    this.tenantProfileService.getPaystackSubaccount().subscribe({
      next: (cfg) => {
        this.subaccountConfig.set(cfg);
        this.loadingSubaccount.set(false);
        if (cfg.has_subaccount) {
          this.gatewayMode.set('subaccount');
        } else if (cfg.has_custom_keys) {
          this.gatewayMode.set('keys');
        }
      },
      error: () => {
        this.loadingSubaccount.set(false);
      }
    });
  }

  loadCountries() {
    this.tenantProfileService.getPaystackCountries().subscribe({
      next: (list) => this.countries.set(list),
      error: (err) => console.error('Failed to load Paystack countries', err)
    });
  }

  loadBanks(country: string) {
    this.loadingBanks.set(true);
    this.tenantProfileService.getPaystackBanks(country).subscribe({
      next: (list) => {
        this.banks.set(list);
        this.loadingBanks.set(false);
      },
      error: (err) => {
        console.error('Failed to load banks', err);
        this.loadingBanks.set(false);
      }
    });
  }

  onCountryChange(country: string) {
    this.selectedCountry.set(country);
    this.selectedBankCode.set('');
    this.bankSearchTerm.set('');
    this.accountNumber.set('');
    this.resolvedAccount.set(null);
    this.resolveError.set('');
    this.loadBanks(country);
  }

  onAccountChange(val: string) {
    this.accountNumber.set(val);
    this.resolvedAccount.set(null);
    this.resolveError.set('');
  }

  onBankSelect(bankCode: string) {
    this.selectedBankCode.set(bankCode);
    this.resolvedAccount.set(null);
    this.resolveError.set('');
  }

  verifyAccount() {
    const accNum = this.accountNumber().trim();
    const bankCode = this.selectedBankCode();

    if (!accNum) {
      this.resolveError.set('Please enter an account or Mobile Money number.');
      return;
    }
    if (!bankCode) {
      this.resolveError.set('Please select your bank or Mobile Money provider first.');
      return;
    }

    this.isResolving.set(true);
    this.resolveError.set('');
    this.resolvedAccount.set(null);

    this.tenantProfileService.resolvePaystackAccount(accNum, bankCode).subscribe({
      next: (resolved) => {
        this.isResolving.set(false);
        this.resolvedAccount.set(resolved);
        if (!this.businessName()) {
          this.businessName.set(resolved.account_name);
        }
        this.toast.success(`Account verified: ${resolved.account_name}`, 'Account Verified');
      },
      error: (err) => {
        this.isResolving.set(false);
        const msg = err.error?.error || 'Could not verify account name. Please double-check account number and bank.';
        this.resolveError.set(msg);
        this.toast.error(msg, 'Verification Failed');
      }
    });
  }

  createAndLinkSubaccount() {
    const resolved = this.resolvedAccount();
    const bank = this.selectedBank();
    const accNum = this.accountNumber().trim();

    if (!resolved || !bank || !accNum) {
      this.toast.warning('Please verify your account first before creating the subaccount.', 'Verification Needed');
      return;
    }

    const schoolName = this.businessName().trim() || resolved.account_name || this.tenantProfile()?.name || 'School Linx Partner';

    this.isCreatingSubaccount.set(true);
    this.tenantProfileService.createPaystackSubaccount({
      country: this.selectedCountry(),
      business_name: schoolName,
      settlement_bank: bank.code,
      bank_name: bank.name,
      account_number: accNum,
      account_name: resolved.account_name,
      percentage_charge: 0 // 100% of fees settle to school
    }).subscribe({
      next: (res) => {
        this.isCreatingSubaccount.set(false);
        this.subaccountCreatedSuccess.set(true);
        this.toast.success(
          `Subaccount (${res.subaccount_code}) connected! All fees will settle to ${bank.name}`,
          'Subaccount Connected'
        );
        this.dialog.alert(
          `Your Paystack Subaccount (${res.subaccount_code}) has been created and linked! All fee payments and wallet top-ups will automatically settle into ${bank.name} - ${accNum} (${resolved.account_name}).`,
          'Subaccount Connected!',
          'success'
        );
        this.loadSubaccountConfig();
        // Reset form
        this.resolvedAccount.set(null);
        this.accountNumber.set('');
        this.selectedBankCode.set('');
      },
      error: (err) => {
        this.isCreatingSubaccount.set(false);
        const msg = err.error?.error || 'Failed to create Paystack subaccount.';
        this.toast.error(msg, 'Subaccount Creation Failed');
      }
    });
  }

  unlinkSubaccount() {
    this.dialog.confirm(
      'Are you sure you want to disconnect this settlement subaccount? If disconnected, automated fee settlement will pause until a new account is connected.',
      'Disconnect Subaccount',
      'warning'
    ).subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.isUnlinking.set(true);
      this.tenantProfileService.removePaystackSubaccount().subscribe({
        next: () => {
          this.isUnlinking.set(false);
          this.toast.info('Subaccount disconnected successfully.', 'Disconnected');
          this.loadSubaccountConfig();
        },
        error: (err) => {
          this.isUnlinking.set(false);
          const msg = err.error?.error || 'Failed to disconnect subaccount';
          this.toast.error(msg, 'Disconnect Failed');
        }
      });
    });
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
    this.showSmsTopUpModal.set(true);
  }

  handleOpenSenderId() {
    this.showSenderIdModal.set(true);
  }

  onSmsTopUpCompleted(newBalance: number) {
    if (this.tenantProfile()) {
      this.tenantProfile.update(p => p ? { ...p, sms_credits: newBalance } : p);
    }
  }

  handleStorageUpgrade() {
    this.dialog.alert('Storage expansion options will be available soon.', 'Expand Storage', 'info');
  }

  savePaymentConfig() {
    const pub = this.paystackPublicKey().trim();
    const sec = this.paystackSecretKey().trim();

    if (!pub || !sec) {
      this.toast.warning('Please provide both your Paystack Public Key and Secret Key.', 'Missing Keys');
      return;
    }

    this.isSavingConfig.set(true);
    this.tenantProfileService.updatePaymentConfig(pub, sec, 'PAYSTACK').subscribe({
      next: () => {
        this.isSavingConfig.set(false);
        this.configSaved.set(true);
        this.hasConfigured.set(true);
        this.paystackSecretKey.set(''); // clear secret from memory
        this.toast.success('Paystack API keys saved successfully!', 'Configuration Saved');
        setTimeout(() => this.configSaved.set(false), 4000);
      },
      error: (err) => {
        this.isSavingConfig.set(false);
        const msg = err.error?.error || 'Failed to save payment configuration.';
        this.toast.error(msg, 'Save Error');
      }
    });
  }
}
