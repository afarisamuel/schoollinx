import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationService, Notification } from '../../core/infrastructure/notifications/notification.service';
import { PushNotificationService } from '../../core/infrastructure/push/push-notification.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './notification-center.component.html'
})
export class NotificationCenterComponent {
  private notificationService = inject(NotificationService);
  readonly pushService = inject(PushNotificationService);
  private toast = inject(ToastService);

  notifications = toSignal(this.notificationService.notifications$, { initialValue: [] as Notification[] });
  isConnected = toSignal(this.notificationService.connected$, { initialValue: false });

  activeFilter = signal<'ALL' | 'UNREAD' | 'PAYMENT' | 'GRADE' | 'ATTENDANCE' | 'HOMEWORK' | 'MESSAGE' | 'SYSTEM'>('ALL');
  searchQuery = signal('');

  async togglePush() {
    try {
      if (this.pushService.isSubscribed()) {
        const success = await this.pushService.unsubscribeFromPush();
        if (success) {
          this.toast.info('Browser push notifications disabled.');
        }
      } else {
        const success = await this.pushService.subscribeToPush();
        if (success) {
          this.toast.success('Browser push notifications enabled!');
        } else {
          this.toast.warning('Push notification permission was denied.');
        }
      }
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to update push notification settings.');
    }
  }

  async testPush() {
    try {
      await this.pushService.sendTestNotification();
      this.toast.success('Test push notification dispatched to your browser.');
    } catch (err: any) {
      this.toast.error('Failed to dispatch test notification: ' + (err?.message || ''));
    }
  }

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
  paymentCount = computed(() => this.notifications().filter(n => n.type === 'PAYMENT').length);
  gradeCount = computed(() => this.notifications().filter(n => n.type === 'GRADE').length);
  attendanceCount = computed(() => this.notifications().filter(n => n.type === 'ATTENDANCE').length);
  homeworkCount = computed(() => this.notifications().filter(n => n.type === 'HOMEWORK').length);
  messageCount = computed(() => this.notifications().filter(n => n.type === 'MESSAGE').length);
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
      if (filter === 'HOMEWORK' && item.type !== 'HOMEWORK') return false;
      if (filter === 'MESSAGE' && item.type !== 'MESSAGE') return false;
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

  refreshFeed() {
    this.notificationService.loadInitialNotifications();
    this.toast.success('Notification feed refreshed.');
  }

  markAsRead(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
    this.toast.success('All notifications marked as read.');
  }

  clearAll() {
    this.notificationService.clearAll();
    this.toast.info('Notification feed cleared.');
  }

  getIconClass(type: Notification['type']): string {
    const icons: Record<string, string> = {
      PAYMENT: 'fas fa-receipt',
      GRADE: 'fas fa-graduation-cap',
      ATTENDANCE: 'fas fa-fingerprint',
      HOMEWORK: 'fas fa-book-open',
      MESSAGE: 'fas fa-comments',
      SYSTEM: 'fas fa-bell'
    };
    return icons[type] || 'fas fa-bell';
  }

  getColorClass(type: Notification['type']): { bg: string; text: string; border: string; glow: string } {
    switch (type) {
      case 'PAYMENT':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-500/30',
          glow: 'from-emerald-500/10'
        };
      case 'GRADE':
        return {
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-600 dark:text-indigo-400',
          border: 'border-indigo-500/30',
          glow: 'from-indigo-500/10'
        };
      case 'ATTENDANCE':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/30',
          glow: 'from-amber-500/10'
        };
      case 'HOMEWORK':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-500/30',
          glow: 'from-purple-500/10'
        };
      case 'MESSAGE':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-500/30',
          glow: 'from-blue-500/10'
        };
      default:
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-600 dark:text-cyan-400',
          border: 'border-cyan-500/30',
          glow: 'from-cyan-500/10'
        };
    }
  }

  getTypeLabel(type: Notification['type']): string {
    const labels: Record<string, string> = {
      PAYMENT: 'Payment & Billing',
      GRADE: 'Academic Assessment',
      ATTENDANCE: 'Attendance Dispatch',
      HOMEWORK: 'Assignment & Tasks',
      MESSAGE: 'Direct Message',
      SYSTEM: 'System Advisory'
    };
    return labels[type] || type;
  }

  getNotificationActionRoute(n: Notification): string | null {
    if (n.type === 'PAYMENT') return '/fiscal';
    if (n.type === 'GRADE') return '/academic';
    if (n.type === 'ATTENDANCE') return '/biometrics';
    if (n.type === 'HOMEWORK') return '/teachers/homework';
    if (n.type === 'MESSAGE') return '/communications/messages';
    return null;
  }

  getNotificationActionLabel(n: Notification): string | null {
    if (n.type === 'PAYMENT') return 'View Financial Ledger';
    if (n.type === 'GRADE') return 'View Academic Record';
    if (n.type === 'ATTENDANCE') return 'View Attendance Hub';
    if (n.type === 'HOMEWORK') return 'View Homework Portal';
    if (n.type === 'MESSAGE') return 'Open Messaging';
    return null;
  }
}
