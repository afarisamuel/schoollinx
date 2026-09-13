import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  TenantService,
  Tenant,
  PlatformPaymentRecord,
  PlatformFinanceLedgerSummary,
  ReconcilePaymentRequest,
  RefundPaymentRequest
} from '../../../core/services/tenant.service';

@Component({
  selector: 'app-transactions-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './transactions-ledger.component.html'
})
export class TransactionsLedgerComponent implements OnInit {
  private tenantService = inject(TenantService);

  // Data Signals
  isLoading = signal<boolean>(true);
  isActionLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  transactions = signal<PlatformPaymentRecord[]>([]);
  tenants = signal<Tenant[]>([]);
  totalCount = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(50);

  summary = signal<PlatformFinanceLedgerSummary>({
    total_volume: 0,
    total_transactions: 0,
    subaccount_volume: 0,
    subaccount_transactions: 0,
    main_account_volume: 0,
    main_account_transactions: 0,
    misrouted_volume: 0,
    misrouted_count: 0,
    unreconciled_misrouted_count: 0,
    total_refunded_volume: 0
  });

  // Filters
  searchQuery = signal<string>('');
  selectedTenantId = signal<string>('');
  selectedCategory = signal<string>('');
  selectedRoutingType = signal<string>('');
  selectedStatus = signal<string>('');
  misroutedOnly = signal<boolean>(false);

  // Modals & Active Items
  selectedTx = signal<PlatformPaymentRecord | null>(null);
  showDetailModal = signal<boolean>(false);

  reconcileModalTx = signal<PlatformPaymentRecord | null>(null);
  reconciliationRef = signal<string>('');
  reconciliationNotes = signal<string>('');

  refundModalTx = signal<PlatformPaymentRecord | null>(null);
  refundReason = signal<string>('');
  refundAmount = signal<number>(0);

  // Copied Reference state
  copiedRef = signal<string | null>(null);

  ngOnInit() {
    this.loadTenants();
    this.loadTransactions();
  }

  loadTenants() {
    this.tenantService.getTenants().subscribe({
      next: (list) => this.tenants.set(list || []),
      error: (err) => console.error('Failed to load tenants list', err)
    });
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const params: any = {
      page: this.page(),
      limit: this.pageSize(),
      tenant_id: this.selectedTenantId() || undefined,
      category: this.selectedCategory() || undefined,
      routing_type: this.selectedRoutingType() || undefined,
      status: this.selectedStatus() || undefined,
      misrouted_only: this.misroutedOnly() ? true : undefined,
      search: this.searchQuery().trim() || undefined
    };

    this.tenantService.getPlatformTransactions(params).subscribe({
      next: (res) => {
        this.transactions.set(res.transactions || []);
        this.totalCount.set(res.total || 0);
        if (res.summary) {
          this.summary.set(res.summary);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions', err);
        this.errorMessage.set(err?.error?.error || 'Failed to fetch platform transactions ledger.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.page.set(1);
    this.loadTransactions();
  }

  toggleMisroutedOnly() {
    this.misroutedOnly.set(!this.misroutedOnly());
    this.onFilterChange();
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTenantId.set('');
    this.selectedCategory.set('');
    this.selectedRoutingType.set('');
    this.selectedStatus.set('');
    this.misroutedOnly.set(false);
    this.page.set(1);
    this.loadTransactions();
  }

  copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.copiedRef.set(text);
      setTimeout(() => this.copiedRef.set(null), 2000);
    }
  }

  // Open Details Modal
  openDetails(tx: PlatformPaymentRecord) {
    this.selectedTx.set(tx);
    this.showDetailModal.set(true);
  }

  closeDetails() {
    this.selectedTx.set(null);
    this.showDetailModal.set(false);
  }

  // Reconcile Modal
  openReconcile(tx: PlatformPaymentRecord, event?: Event) {
    if (event) event.stopPropagation();
    this.reconcileModalTx.set(tx);
    this.reconciliationRef.set(`BANK-REMIT-${Date.now().toString().slice(-6)}`);
    this.reconciliationNotes.set(`Remitted GHS ${tx.amount.toFixed(2)} to ${tx.tenant_name} via Direct Bank / MoMo settlement.`);
  }

  closeReconcile() {
    this.reconcileModalTx.set(null);
    this.reconciliationRef.set('');
    this.reconciliationNotes.set('');
  }

  confirmReconciliation() {
    const tx = this.reconcileModalTx();
    if (!tx) return;

    if (!this.reconciliationRef().trim()) {
      alert('Please enter a bank/remittance transfer reference ID.');
      return;
    }

    this.isActionLoading.set(true);
    const req: ReconcilePaymentRequest = {
      reconciliation_ref: this.reconciliationRef().trim(),
      reconciliation_notes: this.reconciliationNotes().trim(),
      reconciled_by: 'Super Admin'
    };

    this.tenantService.reconcilePayment(tx.reference, req).subscribe({
      next: (res) => {
        this.isActionLoading.set(false);
        this.closeReconcile();
        this.showFlashSuccess(`Payment ${tx.reference} successfully reconciled & remitted to ${tx.tenant_name}.`);
        this.loadTransactions();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.error || 'Failed to record payment reconciliation.');
      }
    });
  }

  // Refund Modal
  openRefund(tx: PlatformPaymentRecord, event?: Event) {
    if (event) event.stopPropagation();
    this.refundModalTx.set(tx);
    this.refundAmount.set(tx.amount);
    this.refundReason.set('');
  }

  closeRefund() {
    this.refundModalTx.set(null);
    this.refundReason.set('');
    this.refundAmount.set(0);
  }

  confirmRefund() {
    const tx = this.refundModalTx();
    if (!tx) return;

    if (!this.refundReason().trim()) {
      alert('Please state a reason for this refund.');
      return;
    }

    this.isActionLoading.set(true);
    const req: RefundPaymentRequest = {
      refund_amount: this.refundAmount() || tx.amount,
      refund_reason: this.refundReason().trim(),
      refunded_by: 'Super Admin'
    };

    this.tenantService.refundPayment(tx.reference, req).subscribe({
      next: (res) => {
        this.isActionLoading.set(false);
        this.closeRefund();
        this.showFlashSuccess(`Refund recorded for ${tx.reference}.`);
        this.loadTransactions();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.error || 'Failed to process transaction refund.');
      }
    });
  }

  // Verify Live with Paystack
  verifyTransaction(tx: PlatformPaymentRecord, event?: Event) {
    if (event) event.stopPropagation();
    this.isActionLoading.set(true);

    this.tenantService.verifyPlatformPayment(tx.reference).subscribe({
      next: (res) => {
        this.isActionLoading.set(false);
        const status = res?.verification?.status || 'verified';
        this.showFlashSuccess(`Paystack Verification Result for ${tx.reference}: ${status.toUpperCase()}`);
        this.loadTransactions();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.error || 'Failed to verify transaction with Paystack.');
      }
    });
  }

  showFlashSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 5000);
  }

  // Export CSV
  exportCSV() {
    const list = this.transactions();
    if (!list.length) {
      alert('No transactions available to export.');
      return;
    }

    const headers = [
      'Reference',
      'Date',
      'School Subdomain',
      'School Name',
      'Payer Name',
      'Payer Email',
      'Payer Phone',
      'Category',
      'Amount (GHS)',
      'Routing Type',
      'Subaccount Code',
      'Status',
      'Is Misrouted',
      'Reconciled',
      'Reconciliation Ref',
      'Refunded',
      'Refund Reason'
    ];

    const rows = list.map(tx => [
      `"${tx.reference}"`,
      `"${tx.created_at}"`,
      `"${tx.tenant_subdomain || ''}"`,
      `"${tx.tenant_name || ''}"`,
      `"${tx.payer_name || ''}"`,
      `"${tx.payer_email || ''}"`,
      `"${tx.payer_phone || ''}"`,
      `"${tx.category}"`,
      tx.amount.toFixed(2),
      `"${tx.routing_type}"`,
      `"${tx.subaccount_code || ''}"`,
      `"${tx.status}"`,
      tx.is_misrouted ? 'YES' : 'NO',
      tx.reconciled ? 'YES' : 'NO',
      `"${tx.reconciliation_ref || ''}"`,
      tx.refunded ? 'YES' : 'NO',
      `"${tx.refund_reason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `platform_transactions_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getCategoryBadge(cat: string): { label: string; class: string } {
    switch (cat) {
      case 'SCHOOL_FEES':
        return { label: 'School Fees', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'WALLET_TOPUP':
        return { label: 'Wallet Top-Up', class: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
      case 'SUBSCRIPTION':
        return { label: 'Platform SaaS Sub', class: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'SMS_TOPUP':
        return { label: 'Bulk SMS Top-Up', class: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      default:
        return { label: cat || 'General', class: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    }
  }

  getStatusBadge(status: string): { label: string; class: string } {
    switch (status) {
      case 'PAID':
        return { label: 'PAID / SETTLED', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'PENDING':
        return { label: 'PENDING', class: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'FAILED':
        return { label: 'FAILED', class: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
      case 'REFUNDED':
        return { label: 'REFUNDED', class: 'bg-slate-500/15 text-slate-400 border-slate-500/30 line-through' };
      default:
        return { label: status, class: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  }
}
