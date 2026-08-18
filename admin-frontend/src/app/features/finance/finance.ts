import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceComponent implements OnInit {
  private tenantService = inject(TenantService);

  // KPI Overview
  overview = signal<any>(null);
  revenueByPlan = signal<any[]>([]);
  tenantHealth = signal<any[]>([]);
  churnRiskList = signal<any[]>([]);
  isLoading = signal(true);

  // Tenant Health Table Filter
  healthFilter = signal('');
  filteredTenantHealth = computed(() => {
    const q = this.healthFilter().toLowerCase();
    if (!q) return this.tenantHealth();
    return this.tenantHealth().filter(t =>
      t.name.toLowerCase().includes(q) || t.plan.toLowerCase().includes(q)
    );
  });

  // Largest plan slice for bar-chart width
  maxPlanRevenue = computed(() => {
    const plans = this.revenueByPlan();
    if (!plans.length) return 1;
    return Math.max(...plans.map((p: any) => p.revenue), 1);
  });

  ngOnInit() {
    forkJoin([
      this.tenantService.getFinanceOverview(),
      this.tenantService.getRevenueByPlan(),
      this.tenantService.getTenantHealth(),
      this.tenantService.getChurnRisk(),
    ]).subscribe({
      next: ([overview, byPlan, health, churn]) => {
        this.overview.set(overview);
        this.revenueByPlan.set(byPlan || []);
        this.tenantHealth.set(health || []);
        this.churnRiskList.set(churn || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  planColor(plan: string): string {
    const colors: Record<string, string> = {
      'PRO': 'bg-accent-primary',
      'ENTERPRISE': 'bg-purple-500',
      'USAGE': 'bg-amber-500',
      'BASIC': 'bg-emerald-500',
    };
    return colors[plan] || 'bg-text-muted';
  }

  planTextColor(plan: string): string {
    const colors: Record<string, string> = {
      'PRO': 'text-accent-primary border-accent-primary/20 bg-accent-primary/10',
      'ENTERPRISE': 'text-purple-400 border-purple-500/20 bg-purple-500/10',
      'USAGE': 'text-amber-400 border-amber-500/20 bg-amber-500/10',
      'BASIC': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    };
    return colors[plan] || 'text-text-muted border-border-primary bg-bg-tertiary';
  }

  storageBarColor(pct: number): string {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  onHealthFilter(e: Event) {
    this.healthFilter.set((e.target as HTMLInputElement).value);
  }
}
