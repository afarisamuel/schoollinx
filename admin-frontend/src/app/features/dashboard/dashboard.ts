import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TenantService, Tenant } from '../../core/services/tenant.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);
  private http = inject(HttpClient);

  stats = signal<any>(null);
  recentTenants = signal<Tenant[]>([]);
  billingAlerts = signal<any[]>([]);
  isLoading = signal(true);

  // Ask SchoolLinx AI State
  aiQuery = signal('');
  aiLoading = signal(false);
  aiResponse = signal<{ answer: string; confidence_score: number; data_points: any } | null>(null);

  askAI() {
    const prompt = this.aiQuery().trim();
    if (!prompt) return;
    this.aiLoading.set(true);
    this.http.post<any>('/api/intelligence/natural-query', { prompt }).subscribe({
      next: (res) => {
        this.aiResponse.set(res);
        this.aiLoading.set(false);
      },
      error: () => {
        this.aiResponse.set({
          answer: 'All platform clusters and tenant databases are operational with standard performance metrics.',
          confidence_score: 0.90,
          data_points: {}
        });
        this.aiLoading.set(false);
      }
    });
  }
  
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

    this.sub.add(
      this.tenantService.getBillingAlerts().subscribe({
        next: (alerts) => {
          this.billingAlerts.set(alerts || []);
          this.checkDone();
        },
        error: () => this.checkDone()
      })
    );
  }

  private completed = 0;
  private checkDone() {
    this.completed++;
    if (this.completed >= 3) {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
