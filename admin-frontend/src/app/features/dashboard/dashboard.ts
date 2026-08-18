import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant } from '../../core/services/tenant.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);

  stats = signal<any>(null);
  recentTenants = signal<Tenant[]>([]);
  isLoading = signal(true);
  
  private sub = new Subscription();

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    this.sub.add(
      this.tenantService.getStats().subscribe({
        next: (data) => {
          this.stats.set(data);
          this.checkDone();
        },
        error: () => this.checkDone()
      })
    );

    this.sub.add(
      this.tenantService.getTenants().subscribe({
        next: (data) => {
          // Sort by creation date or just take first 10
          this.recentTenants.set((data || []).slice(0, 10));
          this.checkDone();
        },
        error: () => this.checkDone()
      })
    );
  }

  private completed = 0;
  private checkDone() {
    this.completed++;
    if (this.completed >= 2) {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
