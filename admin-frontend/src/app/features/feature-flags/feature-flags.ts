import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant } from '../../core/services/tenant.service';

export interface FeatureModule {
  key: string;
  name: string;
  description: string;
  category: 'CORE' | 'ACADEMIC' | 'OPERATIONS' | 'FINANCIAL' | 'COMMUNICATION';
  icon: string;
}

export const AVAILABLE_MODULES: FeatureModule[] = [
  { key: 'biometrics', name: 'Biometrics & RFID Hub', description: 'Hardware integration for turnstiles & card scanners', category: 'OPERATIONS', icon: 'fingerprint' },
  { key: 'cbt', name: 'Computer-Based Testing', description: 'Online exam engine with question banks & timers', category: 'ACADEMIC', icon: 'desktop' },
  { key: 'library', name: 'Library & Asset Catalog', description: 'Book lending, barcode tracking & overdue fines', category: 'ACADEMIC', icon: 'book' },
  { key: 'fiscal_billing', name: 'Fiscal Billing Engine', description: 'Terminal pupil bills, fee items & PDF generation', category: 'FINANCIAL', icon: 'credit-card' },
  { key: 'online_payments', name: 'Paystack Parent Gateway', description: 'Online mobile money & card fee collections', category: 'FINANCIAL', icon: 'cash' },
  { key: 'daily_bill', name: 'Daily Micro-Billing', description: 'Day-by-day canteen, transport & snack tracking', category: 'FINANCIAL', icon: 'receipt' },
  { key: 'transport_logistics', name: 'Fleet & Route Tracking', description: 'Bus routes, driver management & passenger logs', category: 'OPERATIONS', icon: 'truck' },
  { key: 'hostel', name: 'Hostel & Room Allocations', description: 'Dormitory blocks, bed assignments & roll call', category: 'OPERATIONS', icon: 'home' },
  { key: 'inventory', name: 'Inventory & Procurement', description: 'Stock levels, purchase orders & asset auditing', category: 'OPERATIONS', icon: 'archive' },
  { key: 'hr_payroll', name: 'HR & Staff Payroll', description: 'Employee records, allowances, deductions & payslips', category: 'CORE', icon: 'users' },
  { key: 'alumni', name: 'Alumni Network Portal', description: 'Graduate directory, legacy transcripts & events', category: 'ACADEMIC', icon: 'academic' },
  { key: 'parent_portal', name: 'Guardian/Parent Portal', description: 'Dedicated portal for fee status & report cards', category: 'COMMUNICATION', icon: 'user-group' },
  { key: 'student_portal', name: 'Student Learning Portal', description: 'Assignments, timetable & grades viewer', category: 'ACADEMIC', icon: 'user' },
  { key: 'sms_notifications', name: 'Automated SMS Engine', description: 'Instant SMS triggers on fee payment & scan events', category: 'COMMUNICATION', icon: 'chat' },
  { key: 'ai_insights', name: 'AI Academic Intelligence', description: 'Predictive retention risk & grade trends analysis', category: 'ACADEMIC', icon: 'sparkles' },
];

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feature-flags.html'
})
export class FeatureFlagsComponent implements OnInit {
  private tenantService = inject(TenantService);

  tenants = signal<Tenant[]>([]);
  selectedTenantId = signal<string>('');
  isLoadingTenants = signal(true);
  isLoadingFlags = signal(false);
  isSaving = signal(false);

  availableModules = AVAILABLE_MODULES;
  currentFlags = signal<Record<string, boolean>>({});
  searchQuery = signal('');
  selectedCategory = signal<string>('ALL');

  successMsg = signal('');
  errorMsg = signal('');

  selectedTenant = computed(() => {
    return this.tenants().find(t => t.id === this.selectedTenantId()) || null;
  });

  filteredModules = computed(() => {
    let list = this.availableModules;
    const cat = this.selectedCategory();
    if (cat !== 'ALL') {
      list = list.filter(m => m.category === cat);
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q)
      );
    }
    return list;
  });

  enabledCount = computed(() => {
    const flags = this.currentFlags();
    return Object.values(flags).filter(Boolean).length;
  });

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.isLoadingTenants.set(true);
    this.tenantService.getTenants().subscribe({
      next: (data) => {
        this.tenants.set(data || []);
        if (data && data.length > 0) {
          this.selectTenant(data[0].id);
        }
        this.isLoadingTenants.set(false);
      },
      error: () => this.isLoadingTenants.set(false)
    });
  }

  selectTenant(id: string) {
    this.selectedTenantId.set(id);
    this.isLoadingFlags.set(true);
    this.tenantService.getFeatureFlags(id).subscribe({
      next: (res) => {
        // Default all defined modules to true if not explicitly set
        const flags: Record<string, boolean> = {};
        for (const mod of this.availableModules) {
          flags[mod.key] = res.feature_flags && res.feature_flags[mod.key] !== undefined
            ? res.feature_flags[mod.key]
            : true;
        }
        this.currentFlags.set(flags);
        this.isLoadingFlags.set(false);
      },
      error: () => {
        // Default to all true
        const flags: Record<string, boolean> = {};
        for (const mod of this.availableModules) {
          flags[mod.key] = true;
        }
        this.currentFlags.set(flags);
        this.isLoadingFlags.set(false);
      }
    });
  }

  toggleFlag(key: string) {
    const cur = this.currentFlags();
    this.currentFlags.set({
      ...cur,
      [key]: !cur[key]
    });
  }

  enableAll() {
    const updated: Record<string, boolean> = {};
    for (const mod of this.availableModules) {
      updated[mod.key] = true;
    }
    this.currentFlags.set(updated);
  }

  disableAll() {
    const updated: Record<string, boolean> = {};
    for (const mod of this.availableModules) {
      updated[mod.key] = false;
    }
    this.currentFlags.set(updated);
  }

  saveFlags() {
    const tenantId = this.selectedTenantId();
    if (!tenantId) return;

    this.isSaving.set(true);
    this.tenantService.updateFeatureFlags(tenantId, this.currentFlags()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMsg.set(`Feature flags saved for ${this.selectedTenant()?.name}`);
        setTimeout(() => this.successMsg.set(''), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMsg.set(err?.error?.error || 'Failed to save feature flags');
        setTimeout(() => this.errorMsg.set(''), 4000);
      }
    });
  }
}
