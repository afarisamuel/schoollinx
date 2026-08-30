import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationService, Notification } from '../../core/infrastructure/notifications/notification.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './notification-center.component.html'
})
export class NotificationCenterComponent {
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  notifications = toSignal(this.notificationService.notifications$, { initialValue: [] as Notification[] });
  isConnected = toSignal(this.notificationService.connected$, { initialValue: false });

  activeFilter = signal<'ALL' | 'UNREAD' | 'PAYMENT' | 'GRADE' | 'ATTENDANCE' | 'SYSTEM'>('ALL');
  searchQuery = signal('');

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  paymentCount = computed(() => this.notifications().filter(n => n.type === 'PAYMENT').length);
  gradeCount = computed(() => this.notifications().filter(n => n.type === 'GRADE').length);
  attendanceCount = computed(() => this.notifications().filter(n => n.type === 'ATTENDANCE').length);
  systemCount = computed(() => this.notifications().filter(n => n.type === 'SYSTEM').length);

  filteredNotifications = computed(() => {
    const list = this.notifications();
    const filter = this.activeFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter(item => {
      // Filter by category or read status
      if (filter === 'UNREAD' && item.read) return false;
      if (filter === 'PAYMENT' && item.type !== 'PAYMENT') return false;
      if (filter === 'GRADE' && item.type !== 'GRADE') return false;
      if (filter === 'ATTENDANCE' && item.type !== 'ATTENDANCE') return false;
      if (filter === 'SYSTEM' && item.type !== 'SYSTEM') return false;

      // Filter by search query
      if (q) {
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        return matchesTitle || matchesMsg;
      }
      return true;
    });
  });

  markAsRead(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
    this.toast.success('All notifications marked as read');
  }

  clearAll() {
    this.notificationService.clearAll();
    this.toast.info('Notification feed cleared');
  }

  getIcon(type: Notification['type']): string {
    return this.notificationService.getTypeIcon(type);
  }

  getColor(type: Notification['type']): string {
    return this.notificationService.getTypeColor(type);
  }

  getTypeLabel(type: Notification['type']): string {
    const labels: Record<string, string> = {
      PAYMENT: 'Payment & Billing',
      GRADE: 'Academic Grade',
      ATTENDANCE: 'Attendance Record',
      SYSTEM: 'System Notice',
      HOMEWORK: 'Homework',
      MESSAGE: 'Communication'
    };
    return labels[type] || type;
  }

  getNotificationActionRoute(n: Notification): string | null {
    if (n.type === 'PAYMENT') return '/fiscal';
    if (n.type === 'GRADE') return '/academic';
    if (n.type === 'ATTENDANCE') return '/biometrics';
    return null;
  }

  getNotificationActionLabel(n: Notification): string | null {
    if (n.type === 'PAYMENT') return 'View Financial Ledger →';
    if (n.type === 'GRADE') return 'View Academic Record →';
    if (n.type === 'ATTENDANCE') return 'View Attendance Hub →';
    return null;
  }
}
