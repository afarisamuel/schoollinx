import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-contact-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './contact-submissions.html'
})
export class ContactSubmissionsComponent implements OnInit {
  private tenantService = inject(TenantService);

  submissions = signal<any[]>([]);
  isLoading = signal(true);
  filter = signal<'ALL' | 'UNREAD' | 'READ' | 'REPLIED'>('ALL');
  updatingId = signal<string | null>(null);

  filteredSubmissions = computed(() => {
    const f = this.filter();
    if (f === 'ALL') return this.submissions();
    return this.submissions().filter(s => s.status === f);
  });

  unreadCount = computed(() => this.submissions().filter(s => s.status === 'UNREAD').length);

  ngOnInit() {
    this.loadSubmissions();
  }

  loadSubmissions() {
    this.isLoading.set(true);
    this.tenantService.getContactSubmissions().subscribe({
      next: (data) => {
        this.submissions.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.submissions.set([]);
        this.isLoading.set(false);
      }
    });
  }

  markAs(id: string, status: string) {
    this.updatingId.set(id);
    this.tenantService.updateContactStatus(id, status).subscribe({
      next: () => {
        this.submissions.update(list =>
          list.map(s => s.id === id ? { ...s, status } : s)
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null)
    });
  }

  statusColor(status: string): string {
    switch (status) {
      case 'UNREAD': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'READ': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'REPLIED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-bg-tertiary text-text-muted border-border-primary';
    }
  }
}
