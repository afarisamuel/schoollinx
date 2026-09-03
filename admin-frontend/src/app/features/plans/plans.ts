import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';
import { AVAILABLE_MODULES, FeatureModule } from '../feature-flags/feature-flags';

export interface PlanDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  per_student_rate: number;
  included_sms: number;
  storage_limit_gb: number;
  max_students: number;
  included_modules: string[];
  is_popular: boolean;
  tenant_count?: number;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans.html'
})
export class PlansComponent implements OnInit {
  private tenantService = inject(TenantService);

  plans = signal<PlanDefinition[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  availableModules = AVAILABLE_MODULES;

  editingPlan = signal<PlanDefinition | null>(null);
  showEditModal = signal(false);

  successMsg = signal('');
  errorMsg = signal('');

  totalSchools = computed(() => {
    return this.plans().reduce((acc, p) => acc + (p.tenant_count || 0), 0);
  });

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.isLoading.set(true);
    this.tenantService.getSubscriptionPlans().subscribe({
      next: (data) => {
        this.plans.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openEditModal(plan: PlanDefinition) {
    this.editingPlan.set(JSON.parse(JSON.stringify(plan)));
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingPlan.set(null);
  }

  toggleModuleInPlan(modKey: string) {
    const plan = this.editingPlan();
    if (!plan) return;

    const idx = plan.included_modules.indexOf(modKey);
    if (idx > -1) {
      plan.included_modules.splice(idx, 1);
    } else {
      plan.included_modules.push(modKey);
    }
  }

  isModuleIncluded(modKey: string): boolean {
    return this.editingPlan()?.included_modules.includes(modKey) || false;
  }

  savePlanChanges() {
    const edited = this.editingPlan();
    if (!edited) return;

    const updated = this.plans().map(p => p.id === edited.id ? edited : p);

    this.isSaving.set(true);
    this.tenantService.saveSubscriptionPlans(updated).subscribe({
      next: () => {
        this.plans.set(updated);
        this.isSaving.set(false);
        this.closeEditModal();
        this.showSuccess(`Plan tier "${edited.name}" updated successfully.`);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err?.error?.error || 'Failed to update plan tier.');
      }
    });
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 4000);
  }

  showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 4000);
  }
}
