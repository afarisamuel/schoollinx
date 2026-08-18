import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../core/services/tenant.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-telemetry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './telemetry.html'
})
export class TelemetryComponent implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);

  activeUsers = signal<any[]>([]);
  moduleUsage = signal<any[]>([]);
  funnelMetrics = signal<any[]>([]);
  errorLogs = signal<any[]>([]);
  isLoading = signal(true);

  private sub = new Subscription();

  ngOnInit() {
    this.loadTelemetry();
  }

  loadTelemetry() {
    this.isLoading.set(true);
    
    this.sub.add(this.tenantService.getTelemetryActiveUsers().subscribe(res => {
      this.activeUsers.set(res || []);
      this.checkDone();
    }));

    this.sub.add(this.tenantService.getTelemetryModuleUsage().subscribe(res => {
      // Sort by usage descending
      const sorted = (res || []).sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
      this.moduleUsage.set(sorted);
      this.checkDone();
    }));

    this.sub.add(this.tenantService.getTelemetryFunnel().subscribe(res => {
      this.funnelMetrics.set(res || []);
      this.checkDone();
    }));

    this.sub.add(this.tenantService.getTelemetryErrors().subscribe(res => {
      this.errorLogs.set(res || []);
      this.checkDone();
    }));
  }

  calls = 0;
  checkDone() {
    this.calls++;
    if (this.calls >= 4) {
      this.isLoading.set(false);
    }
  }
  
  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
