import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TenantService, Tenant } from '../../core/services/tenant.service';

export interface TenantChecklist {
  tenant: Tenant;
  status: any;
  isLoading: boolean;
}

@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './onboarding-checklist.html'
})
export class OnboardingChecklistComponent implements OnInit {
  private tenantService = inject(TenantService);

  checklists = signal<TenantChecklist[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  filterReady = signal<'ALL' | 'READY' | 'IN_PROGRESS'>('ALL');

  filteredChecklists = computed(() => {
    let list = this.checklists();

    const f = this.filterReady();
    if (f === 'READY') {
      list = list.filter(c => c.status?.is_ready_for_launch);
    } else if (f === 'IN_PROGRESS') {
      list = list.filter(c => !c.status?.is_ready_for_launch);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(c =>
        c.tenant.name.toLowerCase().includes(q) ||
        c.tenant.subdomain.toLowerCase().includes(q)
      );
    }

    return list;
  });

  readyCount = computed(() => this.checklists().filter(c => c.status?.is_ready_for_launch).length);
  inProgressCount = computed(() => this.checklists().filter(c => !c.status?.is_ready_for_launch).length);

  ngOnInit() {
    this.loadAllChecklists();
  }

  loadAllChecklists() {
    this.isLoading.set(true);
    this.tenantService.getTenants().subscribe({
      next: (tenants) => {
        const initialList: TenantChecklist[] = (tenants || []).map(t => ({
          tenant: t,
          status: null,
          isLoading: true
        }));
        this.checklists.set(initialList);
        this.isLoading.set(false);

        // Fetch onboarding status for each tenant
        initialList.forEach(item => {
          this.tenantService.getOnboardingStatus(item.tenant.id).subscribe({
            next: (status) => {
              this.checklists.update(list =>
                list.map(entry => entry.tenant.id === item.tenant.id ? { ...entry, status, isLoading: false } : entry)
              );
            },
            error: () => {
              this.checklists.update(list =>
                list.map(entry => entry.tenant.id === item.tenant.id ? { ...entry, isLoading: false } : entry)
              );
            }
          });
        });
      },
      error: () => this.isLoading.set(false)
    });
  }
}
