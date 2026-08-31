import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SmsAdminService, SenderIDRequest, SMSPricingData, SMSTelemetry, SmsLedgerItem } from '../../core/services/sms-admin.service';

@Component({
  selector: 'app-sms-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sms-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmsManagementComponent implements OnInit {
  private smsAdmin = inject(SmsAdminService);

  activeTab = signal<'requests' | 'pricing' | 'tenants' | 'ledger'>('requests');
  isLoading = signal(true);

  // Telemetry & Stats
  telemetry = signal<SMSTelemetry | null>(null);

  // Sender ID Requests
  requests = signal<SenderIDRequest[]>([]);
  requestStatusFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  filteredRequests = computed(() => {
    const filter = this.requestStatusFilter();
    if (filter === 'ALL') return this.requests();
    return this.requests().filter(r => r.status === filter);
  });

  // Rejection Modal
  selectedRequest = signal<SenderIDRequest | null>(null);
  rejectReason = signal('');
  isProcessingAction = signal(false);

  // Pricing & Rates
  pricingData = signal<SMSPricingData | null>(null);
  globalRateInput = signal(0.05);
  isSavingGlobalRate = signal(false);
  globalRateSavedSuccess = signal(false);

  // Calculator preview
  calcGhsAmount = signal(50);
  calcCredits = computed(() => {
    const rate = this.globalRateInput() > 0 ? this.globalRateInput() : 0.05;
    return Math.floor(this.calcGhsAmount() / rate);
  });

  // Tenant Credit Injection Modal
  selectedTenantForCredits = signal<any | null>(null);
  creditInjectAmount = signal(1000);
  creditInjectReason = signal('Super Admin bonus grant');
  isInjectingCredits = signal(false);

  // Custom Tenant Rate Modal
  selectedTenantForRate = signal<any | null>(null);
  tenantCustomRate = signal(0.05);
  isSavingTenantRate = signal(false);

  // Ledger & Search
  ledgerItems = signal<SmsLedgerItem[]>([]);
  tenantSearchQuery = signal('');

  filteredTenants = computed(() => {
    const list = this.pricingData()?.tenants || [];
    const q = this.tenantSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.subdomain.toLowerCase().includes(q) || 
      (t.sms_sender_id && t.sms_sender_id.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading.set(true);
    forkJoin([
      this.smsAdmin.getTelemetry(),
      this.smsAdmin.getRequests(),
      this.smsAdmin.getPricing(),
      this.smsAdmin.getLedger(),
    ]).subscribe({
      next: ([telemetry, requests, pricing, ledger]) => {
        this.telemetry.set(telemetry);
        this.requests.set(requests || []);
        this.pricingData.set(pricing);
        if (pricing?.global_cost_per_sms) {
          this.globalRateInput.set(pricing.global_cost_per_sms);
        }
        this.ledgerItems.set(ledger || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setTab(tab: 'requests' | 'pricing' | 'tenants' | 'ledger') {
    this.activeTab.set(tab);
  }

  approveRequest(req: SenderIDRequest) {
    if (!confirm(`Are you sure you want to approve Sender ID "${req.sender_id}" for ${req.tenant?.name || 'this school'}?`)) {
      return;
    }
    this.isProcessingAction.set(true);
    this.smsAdmin.approveSenderID(req.id).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.loadAllData();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        alert(err.error?.error || 'Failed to approve Sender ID');
      }
    });
  }

  openRejectModal(req: SenderIDRequest) {
    this.selectedRequest.set(req);
    this.rejectReason.set('');
  }

  closeRejectModal() {
    this.selectedRequest.set(null);
    this.rejectReason.set('');
  }

  confirmReject() {
    const req = this.selectedRequest();
    if (!req) return;

    this.isProcessingAction.set(true);
    this.smsAdmin.rejectSenderID(req.id, this.rejectReason()).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.closeRejectModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isProcessingAction.set(false);
        alert(err.error?.error || 'Failed to reject Sender ID');
      }
    });
  }

  saveGlobalRate() {
    const rate = this.globalRateInput();
    if (rate <= 0) {
      alert('Rate must be greater than 0 GHS');
      return;
    }
    this.isSavingGlobalRate.set(true);
    this.smsAdmin.updateGlobalPricing(rate).subscribe({
      next: () => {
        this.isSavingGlobalRate.set(false);
        this.globalRateSavedSuccess.set(true);
        setTimeout(() => this.globalRateSavedSuccess.set(false), 3000);
        this.loadAllData();
      },
      error: (err) => {
        this.isSavingGlobalRate.set(false);
        alert(err.error?.error || 'Failed to update rate');
      }
    });
  }

  openCreditModal(tenant: any) {
    this.selectedTenantForCredits.set(tenant);
    this.creditInjectAmount.set(1000);
    this.creditInjectReason.set('Institutional bonus grant');
  }

  closeCreditModal() {
    this.selectedTenantForCredits.set(null);
  }

  confirmInjectCredits() {
    const tenant = this.selectedTenantForCredits();
    if (!tenant) return;

    this.isInjectingCredits.set(true);
    this.smsAdmin.injectCredits(tenant.id, this.creditInjectAmount(), this.creditInjectReason()).subscribe({
      next: () => {
        this.isInjectingCredits.set(false);
        this.closeCreditModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isInjectingCredits.set(false);
        alert(err.error?.error || 'Failed to inject credits');
      }
    });
  }

  openRateModal(tenant: any) {
    this.selectedTenantForRate.set(tenant);
    this.tenantCustomRate.set(tenant.sms_cost_per_unit || this.globalRateInput());
  }

  closeRateModal() {
    this.selectedTenantForRate.set(null);
  }

  confirmSetTenantRate() {
    const tenant = this.selectedTenantForRate();
    if (!tenant) return;

    this.isSavingTenantRate.set(true);
    this.smsAdmin.setTenantRate(tenant.id, this.tenantCustomRate()).subscribe({
      next: () => {
        this.isSavingTenantRate.set(false);
        this.closeRateModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isSavingTenantRate.set(false);
        alert(err.error?.error || 'Failed to set custom rate');
      }
    });
  }
}
