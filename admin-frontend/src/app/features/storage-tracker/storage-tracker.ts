import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-storage-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './storage-tracker.html'
})
export class StorageTrackerComponent implements OnInit {
  private tenantService = inject(TenantService);

  storageData = signal<any | null>(null);
  isLoading = signal(true);
  searchQuery = signal('');
  filterWarning = signal(false);

  filteredTenants = computed(() => {
    const list = this.storageData()?.tenants || [];
    let filtered = list;

    if (this.filterWarning()) {
      filtered = filtered.filter((t: any) => t.is_warning);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      filtered = filtered.filter((t: any) =>
        t.name.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        (t.plan || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  });

  warningCount = computed(() => {
    const list = this.storageData()?.tenants || [];
    return list.filter((t: any) => t.is_warning).length;
  });

  ngOnInit() {
    this.loadStorage();
  }

  loadStorage() {
    this.isLoading.set(true);
    this.tenantService.getStorageUsage().subscribe({
      next: (data) => {
        this.storageData.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
