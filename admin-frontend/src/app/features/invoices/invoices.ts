import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant } from '../../core/services/tenant.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.html'
})
export class InvoicesComponent implements OnInit {
  private tenantService = inject(TenantService);

  tenants = signal<Tenant[]>([]);
  selectedTenantId = signal<string>('');
  billingPeriod = signal<string>('Term 1 - 2026/2027');
  invoiceNumber = signal<string>('INV-2026-' + Math.floor(1000 + Math.random() * 9000));
  invoiceDate = signal<string>(new Date().toISOString().substring(0, 10));
  dueDate = signal<string>(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10));
  
  // Line items
  includeStudentFees = signal(true);
  includeSMSCredits = signal(false);
  includeStorageFee = signal(false);
  smsUnits = signal(5000);
  smsRate = signal(0.05);
  storageGB = signal(10);
  storageRate = signal(20);
  notes = signal('Payment terms: Net 30 days. Please include invoice number in wire transfer narration.');

  isLoading = signal(true);

  selectedTenant = computed(() => {
    return this.tenants().find(t => t.id === this.selectedTenantId()) || null;
  });

  studentCount = computed(() => {
    return this.selectedTenant()?.student_count || 120;
  });

  perStudentRate = computed(() => {
    const t = this.selectedTenant();
    return (t as any)?.per_student_per_term_rate || t?.per_student_rate || 15;
  });

  studentFeeSubtotal = computed(() => {
    if (!this.includeStudentFees()) return 0;
    return this.studentCount() * this.perStudentRate();
  });

  smsSubtotal = computed(() => {
    if (!this.includeSMSCredits()) return 0;
    return this.smsUnits() * this.smsRate();
  });

  storageSubtotal = computed(() => {
    if (!this.includeStorageFee()) return 0;
    return this.storageGB() * this.storageRate();
  });

  subtotal = computed(() => {
    return this.studentFeeSubtotal() + this.smsSubtotal() + this.storageSubtotal();
  });

  discountAmount = computed(() => {
    const discPct = this.selectedTenant()?.discount_percentage || 0;
    return this.subtotal() * (discPct / 100);
  });

  totalDue = computed(() => {
    const fixedOverride = this.selectedTenant()?.fixed_price_override || 0;
    if (fixedOverride > 0) return fixedOverride;
    return Math.max(0, this.subtotal() - this.discountAmount());
  });

  ngOnInit() {
    this.tenantService.getTenants().subscribe({
      next: (data) => {
        this.tenants.set(data || []);
        if (data && data.length > 0) {
          this.selectedTenantId.set(data[0].id);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  printInvoice() {
    window.print();
  }
}
