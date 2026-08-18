import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemConfig {
  key: string;
  value: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  tenant: { name: string; subdomain: string } | null;
}

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './health.html'
})
export class HealthComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system`;
  private sub = new Subscription();

  healthStatus = signal<any>({
    database: 'Checking...',
    paystack: 'Checking...',
    hubtel: 'Checking...',
    aws_s3: 'Checking...'
  });

  configs = signal<SystemConfig[]>([]);
  tickets = signal<SupportTicket[]>([]);
  isLoading = signal(true);

  // Notification state
  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    this.sub.add(this.http.get<any>(`${this.apiUrl}/health`).subscribe({
      next: (data) => { this.healthStatus.set(data); this.checkDone(); },
      error: () => this.checkDone()
    }));

    this.sub.add(this.http.get<SystemConfig[]>(`${this.apiUrl}/configs`).subscribe({
      next: (data) => { this.configs.set(data || []); this.checkDone(); },
      error: () => this.checkDone()
    }));

    this.sub.add(this.http.get<SupportTicket[]>(`${this.apiUrl}/tickets`).subscribe({
      next: (data) => { this.tickets.set(data || []); this.checkDone(); },
      error: () => this.checkDone()
    }));
  }

  calls = 0;
  checkDone() {
    this.calls++;
    if (this.calls >= 3) {
      this.isLoading.set(false);
    }
  }

  toggleConfig(config: SystemConfig) {
    const newVal = config.value === 'true' ? 'false' : 'true';
    this.http.patch(`${this.apiUrl}/configs/${config.key}`, { value: newVal }).subscribe({
      next: () => {
        const updated = this.configs().map(c => c.key === config.key ? { ...c, value: newVal } : c);
        this.configs.set(updated);
        this.notifySuccess(`Toggled ${config.key} to ${newVal}`);
      },
      error: () => this.notifyError('Failed to update config')
    });
  }

  resolveTicket(id: string) {
    if (confirm('Mark this ticket as resolved?')) {
      this.http.patch(`${this.apiUrl}/tickets/${id}`, { status: 'RESOLVED' }).subscribe({
        next: () => {
          const updated = this.tickets().map(t => t.id === id ? { ...t, status: 'RESOLVED' } : t);
          this.tickets.set(updated);
          this.notifySuccess('Ticket resolved');
        },
        error: () => this.notifyError('Failed to resolve ticket')
      });
    }
  }

  // --- Notifications ---
  private timeoutId: any;
  private notifySuccess(msg: string) {
    this.successMessage.set(msg);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.successMessage.set(''), 4000);
  }

  private notifyError(msg: string) {
    this.errorMessage.set(msg);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.errorMessage.set(''), 4000);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
