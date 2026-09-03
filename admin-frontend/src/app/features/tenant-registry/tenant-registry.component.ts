import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TenantService, Tenant, SubscriptionPayment } from '../../core/services/tenant.service';
import { CommonModule, DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { TenantDrawerComponent } from '../../core/components/tenant-drawer/tenant-drawer';

@Component({
  selector: 'app-tenant-registry',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, DatePipe, TenantDrawerComponent],
  templateUrl: './tenant-registry.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: []
})
export class TenantRegistryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);

  tenants = signal<Tenant[]>([]);
  isLoadingTenants = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Quick-View Drawer (#Phase 3)
  showDrawer = signal(false);
  selectedTenantForDrawer = signal<Tenant | null>(null);

  // Per-row loading state (#8)
  loadingRowIds = signal<Set<string>>(new Set());

  // Search & Filter (#2)
  searchQuery = signal('');
  statusFilter = signal<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Sorting (#3)
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Add Admin Modal State
  showAddAdminModal = signal(false);
  selectedTenantForAdmin = signal<Tenant | null>(null);
  addAdminForm: FormGroup;
  isSubmittingAdmin = signal(false);

  // Configure Billing Modal State
  showBillingModal = signal(false);
  selectedTenantForBilling = signal<Tenant | null>(null);
  billingForm: FormGroup;
  isSubmittingBilling = signal(false);
  availablePlans = ['BASIC', 'PRO', 'ENTERPRISE', 'USAGE'];

  // Wipe Confirmation Modal (#7, #11)
  showWipeModal = signal(false);
  selectedTenantForWipe = signal<Tenant | null>(null);
  wipeConfirmInput = '';
  isWiping = signal(false);

  // Credit Injection State
  showCreditModal = signal(false);
  selectedTenantForCredits = signal<Tenant | null>(null);
  creditForm: FormGroup;
  isInjecting = signal(false);

  // Billing History Modal
  showHistoryModal = signal(false);
  selectedTenantForHistory = signal<Tenant | null>(null);
  billingHistory = signal<SubscriptionPayment[]>([]);
  isLoadingHistory = signal(false);

  // Payment Config Modal
  showPaymentConfigModal = signal(false);
  selectedTenantForPayment = signal<Tenant | null>(null);
  paymentConfigForm: FormGroup;
  isSavingPaymentConfig = signal(false);

  // Computed filtered + sorted list (#2, #3)
  filteredAndSortedTenants = computed(() => {
    let list = this.tenants();

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        (t.schema_name ?? '').toLowerCase().includes(q)
      );
    }

    const f = this.statusFilter();
    if (f === 'ACTIVE') list = list.filter(t => t.is_active);
    if (f === 'SUSPENDED') list = list.filter(t => !t.is_active);

    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (col) {
      list = [...list].sort((a, b) => {
        const av = String((a as any)[col] ?? '');
        const bv = String((b as any)[col] ?? '');
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return list;
  });

  constructor() {
    this.addAdminForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: [''],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.billingForm = this.fb.group({
      subscription_plan: ['BASIC', Validators.required],
      per_student_rate: [0, [Validators.required, Validators.min(0)]],
      sms_credits: [0, [Validators.required, Validators.min(0)]],
      storage_limit_gb: [5, [Validators.required, Validators.min(1)]],
      discount_percentage: [0, [Validators.min(0), Validators.max(100)]],
      fixed_price_override: [0, [Validators.min(0)]],
      billing_due_date: [null]
    });

    this.creditForm = this.fb.group({
      amount: [0, Validators.required],
      reason: ['', Validators.required]
    });

    this.paymentConfigForm = this.fb.group({
      integration_type: ['KEYS', Validators.required],
      paystack_public_key: [''],
      paystack_secret_key: [''],
      business_name: [''],
      settlement_bank: [''],
      account_number: [''],
      percentage_charge: [10.0] // Default to 10%
    });
  }

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.isLoadingTenants.set(true);
    this.tenantService.getTenants().subscribe({
      next: (data) => { this.isLoadingTenants.set(false); this.tenants.set(data); },
      error: () => { this.isLoadingTenants.set(false); }
    });
  }

  // Sorting (#3)
  sort(col: string) {
    if (this.sortColumn() === col) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  // Per-row loading helpers (#8)
  private setRowLoading(id: string, loading: boolean) {
    this.loadingRowIds.update(set => {
      const next = new Set(set);
      loading ? next.add(id) : next.delete(id);
      return next;
    });
  }

  isRowLoading(id: string): boolean {
    return this.loadingRowIds().has(id);
  }

  // Auto-dismiss helpers (#9)
  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 5000);
  }

  private showError(msg: string) {
    this.errorMessage.set(msg);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  toggleStatus(tenant: Tenant) {
    const newStatus = !tenant.is_active;
    this.setRowLoading(tenant.id, true);
    this.tenantService.updateStatus(tenant.id, newStatus).subscribe({
      next: () => {
        this.tenants.update(list =>
          list.map(t => t.id === tenant.id ? { ...t, is_active: newStatus } : t)
        );
        this.showSuccess(`Organization ${tenant.name} has been ${newStatus ? 'activated' : 'suspended'}.`);
        this.setRowLoading(tenant.id, false);
      },
      error: (err) => {
        this.showError(`Failed to update status: ${err?.error?.error || err?.message}`);
        this.setRowLoading(tenant.id, false);
      }
    });
  }

  resendSetupEmail(id: string) {
    this.tenantService.resendSetupEmail(id).subscribe({
      next: () => this.showSuccess('Instructional setup email dispatched to the principal administrator.'),
      error: (err) => this.showError(`Failed to dispatch email: ${err?.error?.error || err?.message}`)
    });
  }

  openAddAdminModal(tenant: Tenant) {
    this.selectedTenantForAdmin.set(tenant);
    this.addAdminForm.reset();
    this.showAddAdminModal.set(true);
  }

  closeAddAdminModal() {
    this.showAddAdminModal.set(false);
    this.selectedTenantForAdmin.set(null);
    this.addAdminForm.reset();
  }

  onAddAdminSubmit() {
    if (this.addAdminForm.invalid || !this.selectedTenantForAdmin()) return;
    this.isSubmittingAdmin.set(true);
    this.tenantService.addTenantAdmin(this.selectedTenantForAdmin()!.id, this.addAdminForm.value).subscribe({
      next: () => {
        this.showSuccess(`Admin account created for ${this.selectedTenantForAdmin()?.name}. They must change the temporary password on first login.`);
        this.isSubmittingAdmin.set(false);
        this.closeAddAdminModal();
      },
      error: (err) => {
        this.showError(`Failed to create admin: ${err?.error?.error || err?.message}`);
        this.isSubmittingAdmin.set(false);
      }
    });
  }

  openBillingModal(tenant: Tenant) {
    this.selectedTenantForBilling.set(tenant);
    this.billingForm.patchValue({
      subscription_plan: tenant.subscription_plan || 'BASIC',
      per_student_rate: (tenant as any).per_student_per_term_rate || tenant.per_student_rate || 0,
      sms_credits: tenant.sms_credits || 0,
      storage_limit_gb: tenant.storage_limit_gb || 5,
      discount_percentage: tenant.discount_percentage || 0,
      fixed_price_override: tenant.fixed_price_override || 0,
      billing_due_date: tenant.billing_due_date ? tenant.billing_due_date.substring(0, 10) : null
    });
    this.showBillingModal.set(true);
  }

  closeBillingModal() {
    this.showBillingModal.set(false);
    this.selectedTenantForBilling.set(null);
    this.billingForm.reset();
  }

  onBillingSubmit() {
    if (this.billingForm.invalid || !this.selectedTenantForBilling()) return;
    this.isSubmittingBilling.set(true);
    this.tenantService.updateBilling(this.selectedTenantForBilling()!.id, this.billingForm.value).subscribe({
      next: () => {
        this.showSuccess(`Billing configuration updated for ${this.selectedTenantForBilling()?.name}.`);
        this.isSubmittingBilling.set(false);
        this.closeBillingModal();
        this.loadTenants();
      },
      error: (err) => {
        this.showError(`Failed to update billing: ${err?.error?.error || err?.message}`);
        this.isSubmittingBilling.set(false);
      }
    });
  }

  // Impersonation via URL param to avoid corrupting admin session (#6)
  impersonateTenant(tenant: Tenant) {
    this.tenantService.impersonate(tenant.id).subscribe({
      next: (res) => {
        const url = `${environment.appUrl}/dashboard?impersonate_token=${encodeURIComponent(res.token)}&subdomain=${encodeURIComponent(tenant.subdomain)}`;
        window.open(url, '_blank');
      },
      error: (err) => this.showError(err.error?.error || 'Failed to impersonate tenant')
    });
  }

  // Typed-name wipe confirmation modal (#7, #11)
  openWipeModal(tenant: Tenant) {
    this.selectedTenantForWipe.set(tenant);
    this.wipeConfirmInput = '';
    this.showWipeModal.set(true);
  }

  closeWipeModal() {
    this.showWipeModal.set(false);
    this.selectedTenantForWipe.set(null);
    this.wipeConfirmInput = '';
  }

  get wipeConfirmValid(): boolean {
    const tenant = this.selectedTenantForWipe();
    return !!tenant && this.wipeConfirmInput === tenant.name;
  }

  confirmWipeTenantData() {
    const tenant = this.selectedTenantForWipe();
    if (!tenant || !this.wipeConfirmValid) return;
    this.isWiping.set(true);
    this.tenantService.resetData(tenant.id).subscribe({
      next: () => {
        this.showSuccess(`All data for ${tenant.name} has been permanently wiped.`);
        this.isWiping.set(false);
        this.closeWipeModal();
        this.loadTenants();
      },
      error: (err) => {
        this.showError(err.error?.error || 'Failed to wipe data');
        this.isWiping.set(false);
      }
    });
  }

  exportTenantData(tenant: Tenant) {
    this.tenantService.exportData(tenant.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tenant.subdomain}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showSuccess(`Data exported for ${tenant.name}`);
      },
      error: () => this.showError(`Failed to export data`)
    });
  }

  openCreditModal(tenant: Tenant) {
    this.selectedTenantForCredits.set(tenant);
    this.creditForm.reset({ amount: 0, reason: '' });
    this.showCreditModal.set(true);
  }

  closeCreditModal() {
    this.showCreditModal.set(false);
    this.selectedTenantForCredits.set(null);
  }

  // Billing History
  openHistoryModal(tenant: Tenant) {
    this.selectedTenantForHistory.set(tenant);
    this.billingHistory.set([]);
    this.isLoadingHistory.set(true);
    this.showHistoryModal.set(true);
    this.tenantService.getSubscriptionHistory(tenant.id).subscribe({
      next: (data) => { this.billingHistory.set(data || []); this.isLoadingHistory.set(false); },
      error: () => { this.billingHistory.set([]); this.isLoadingHistory.set(false); }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal.set(false);
    this.selectedTenantForHistory.set(null);
  }

  // Payment Config
  openPaymentConfigModal(tenant: Tenant) {
    this.selectedTenantForPayment.set(tenant);
    const hasSubaccount = !!tenant.paystack_subaccount_code;
    
    this.paymentConfigForm.patchValue({
      integration_type: hasSubaccount ? 'SUBACCOUNT' : 'KEYS',
      paystack_public_key: tenant.paystack_public_key || '',
      paystack_secret_key: '',
      business_name: tenant.name || '',
      settlement_bank: '',
      account_number: '',
      percentage_charge: 10.0
    });
    this.showPaymentConfigModal.set(true);
  }

  closePaymentConfigModal() {
    this.showPaymentConfigModal.set(false);
    this.selectedTenantForPayment.set(null);
    this.paymentConfigForm.reset();
  }

  onPaymentConfigSubmit() {
    if (!this.selectedTenantForPayment()) return;
    this.isSavingPaymentConfig.set(true);
    this.tenantService.updatePaymentConfig(this.selectedTenantForPayment()!.id, this.paymentConfigForm.value).subscribe({
      next: () => {
        this.showSuccess(`Payment gateway updated for ${this.selectedTenantForPayment()?.name}.`);
        this.isSavingPaymentConfig.set(false);
        this.closePaymentConfigModal();
        this.loadTenants();
      },
      error: (err) => {
        this.showError(err?.error?.error || 'Failed to update payment config');
        this.isSavingPaymentConfig.set(false);
      }
    });
  }

  onCreditSubmit() {
    if (this.creditForm.invalid || !this.selectedTenantForCredits()) return;
    this.isInjecting.set(true);
    const val = this.creditForm.value;
    this.tenantService.injectCredits(this.selectedTenantForCredits()!.id, val.amount, val.reason).subscribe({
      next: () => {
        this.showSuccess(`Credits injected for ${this.selectedTenantForCredits()?.name}`);
        this.isInjecting.set(false);
        this.closeCreditModal();
        this.loadTenants();
      },
      error: (err) => {
        this.showError(err.error?.error || 'Failed to inject credits');
        this.isInjecting.set(false);
      }
    });
  }

  forcePasswordReset(tenant: Tenant) {
    if (confirm(`WARNING: This will immediately invalidate all active sessions and force a password reset for ALL staff at ${tenant.name}. Proceed?`)) {
      this.tenantService.forcePasswordReset(tenant.id).subscribe({
        next: () => this.showSuccess(`Global password reset enforced for ${tenant.name}`),
        error: () => this.showError(`Failed to force password reset for ${tenant.name}`)
      });
    }
  }

  // Fixed: use signal mutation instead of direct object mutation (#10)
  toggle2FA(tenant: Tenant) {
    const newVal = !tenant.require_2fa;
    const action = newVal ? 'ENFORCE' : 'DISABLE';
    if (confirm(`Are you sure you want to ${action} 2FA for all staff at ${tenant.name}?`)) {
      this.tenantService.toggle2FA(tenant.id, newVal).subscribe({
        next: () => {
          this.tenants.update(list =>
            list.map(t => t.id === tenant.id ? { ...t, require_2fa: newVal } : t)
          );
          this.showSuccess(`2FA requirement updated for ${tenant.name}`);
        },
        error: () => this.showError(`Failed to update 2FA for ${tenant.name}`)
      });
    }
  }

  openDrawer(tenant: Tenant) {
    this.selectedTenantForDrawer.set(tenant);
    this.showDrawer.set(true);
  }

  closeDrawer() {
    this.showDrawer.set(false);
    this.selectedTenantForDrawer.set(null);
  }

  // Bulk Import CSV State & Actions
  showBulkImportModal = signal(false);
  bulkImportCsvText = signal('');
  bulkImportParsed = signal<any[]>([]);
  isBulkImporting = signal(false);
  bulkImportResult = signal<any | null>(null);

  openBulkImportModal() {
    this.showBulkImportModal.set(true);
    this.bulkImportCsvText.set('');
    this.bulkImportParsed.set([]);
    this.bulkImportResult.set(null);
  }

  closeBulkImportModal() {
    this.showBulkImportModal.set(false);
    this.bulkImportResult.set(null);
  }

  onCsvFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.bulkImportCsvText.set(text);
      this.parseCsv(text);
    };
    reader.readAsText(file);
  }

  parseCsv(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      this.bulkImportParsed.set([]);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 2) continue;

      const name = parts[0] || '';
      const subdomain = parts[1] || name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const adminEmail = parts[2] || `admin@${subdomain}.com`;
      const plan = parts[3] || 'BASIC';
      const studentRate = parseFloat(parts[4] || '15') || 15;

      items.push({
        name,
        subdomain,
        admin_email: adminEmail,
        plan,
        student_rate: studentRate
      });
    }

    this.bulkImportParsed.set(items);
  }

  executeBulkImport() {
    const items = this.bulkImportParsed();
    if (items.length === 0) return;

    this.isBulkImporting.set(true);
    this.tenantService.bulkImportTenants(items).subscribe({
      next: (res) => {
        this.isBulkImporting.set(false);
        this.bulkImportResult.set(res);
        this.loadTenants();
      },
      error: () => {
        this.isBulkImporting.set(false);
        this.showError('Failed to execute bulk import pipeline');
      }
    });
  }
}
