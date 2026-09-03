import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-tickets.html'
})
export class SupportTicketsComponent implements OnInit {
  private tenantService = inject(TenantService);

  tickets = signal<any[]>([]);
  isLoading = signal(true);
  statusFilter = signal<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('ALL');
  priorityFilter = signal<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  searchQuery = signal('');

  selectedTicket = signal<any | null>(null);
  showDetailModal = signal(false);
  isUpdating = signal(false);

  filteredTickets = computed(() => {
    let list = this.tickets();

    const sf = this.statusFilter();
    if (sf !== 'ALL') {
      list = list.filter(t => (t.status || 'OPEN').toUpperCase() === sf);
    }

    const pf = this.priorityFilter();
    if (pf !== 'ALL') {
      list = list.filter(t => (t.priority || 'MEDIUM').toUpperCase() === pf);
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        (t.subject || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.Tenant?.name || '').toLowerCase().includes(q) ||
        (t.user_email || '').toLowerCase().includes(q)
      );
    }

    return list;
  });

  openCount = computed(() => this.tickets().filter(t => (t.status || 'OPEN').toUpperCase() === 'OPEN').length);
  inProgressCount = computed(() => this.tickets().filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length);
  resolvedCount = computed(() => this.tickets().filter(t => ['RESOLVED', 'CLOSED'].includes((t.status || '').toUpperCase())).length);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.tenantService.getSupportTickets().subscribe({
      next: (data) => {
        this.tickets.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  viewTicket(t: any) {
    this.selectedTicket.set(t);
    this.showDetailModal.set(true);
  }

  closeModal() {
    this.showDetailModal.set(false);
    this.selectedTicket.set(null);
  }

  changeStatus(ticket: any, newStatus: string) {
    this.isUpdating.set(true);
    this.tenantService.updateTicketStatus(ticket.id, newStatus).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.tickets.update(list =>
          list.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t)
        );
        if (this.selectedTicket()?.id === ticket.id) {
          this.selectedTicket.set({ ...this.selectedTicket(), status: newStatus });
        }
      },
      error: () => this.isUpdating.set(false)
    });
  }
}
