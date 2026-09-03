import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-billing-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './billing-alerts.html'
})
export class BillingAlertsComponent implements OnInit {
  private tenantService = inject(TenantService);

  alerts = signal<any[]>([]);
  isLoading = signal(true);
  filterType = signal<'ALL' | 'OVERDUE' | 'TRIAL_EXPIRING' | 'LOW_SMS' | 'HIGH_STORAGE'>('ALL');
  filterSeverity = signal<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  searchQuery = signal('');

  // Modals
  showCreditModal = signal(false);
  selectedTenant = signal<any | null>(null);
  creditAmount = signal(1000);
  creditReason = signal('Emergency low credit top-up');
  isInjecting = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  filteredAlerts = computed(() => {
    let list = this.alerts();

    const fType = this.filterType();
    if (fType !== 'ALL') {
      list = list.filter(a => a.alert_type === fType);
    }

    const fSev = this.filterSeverity();
    if (fSev !== 'ALL') {
      list = list.filter(a => a.severity === fSev);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.subdomain || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  });

  criticalCount = computed(() => this.alerts().filter(a => a.severity === 'CRITICAL').length);
  overdueCount = computed(() => this.alerts().filter(a => a.alert_type === 'OVERDUE').length);
  trialCount = computed(() => this.alerts().filter(a => a.alert_type === 'TRIAL_EXPIRING').length);
  lowSmsCount = computed(() => this.alerts().filter(a => a.alert_type === 'LOW_SMS').length);

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.isLoading.set(true);
    this.tenantService.getBillingAlerts().subscribe({
      next: (data) => {
        this.alerts.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreditModal(alert: any) {
    this.selectedTenant.set(alert);
    this.creditAmount.set(1000);
    this.showCreditModal.set(true);
  }

  closeCreditModal() {
    this.showCreditModal.set(false);
    this.selectedTenant.set(null);
  }

  confirmInjectCredits() {
    const t = this.selectedTenant();
    if (!t) return;

    this.isInjecting.set(true);
    this.tenantService.injectCredits(t.tenant_id, this.creditAmount(), this.creditReason()).subscribe({
      next: () => {
        this.isInjecting.set(false);
        this.closeCreditModal();
        this.successMsg.set(`Injected ${this.creditAmount()} SMS credits to ${t.name}`);
        setTimeout(() => this.successMsg.set(''), 4000);
        this.loadAlerts();
      },
      error: (err) => {
        this.isInjecting.set(false);
        this.errorMsg.set(err?.error?.error || 'Failed to inject credits');
        setTimeout(() => this.errorMsg.set(''), 4000);
      }
    });
  }
}
