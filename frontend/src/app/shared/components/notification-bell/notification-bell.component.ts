import { Component, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService, Notification } from '../../../core/infrastructure/notifications/notification.service';
import { PushNotificationService } from '../../../core/infrastructure/push/push-notification.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule, DatePipe, RouterModule],
    templateUrl: './notification-bell.component.html',
    styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
    private notificationService = inject(NotificationService);
    readonly pushService = inject(PushNotificationService);

    isOpen = signal(false);
    notifications = toSignal(this.notificationService.notifications$, { initialValue: [] as Notification[] });
    isConnected = toSignal(this.notificationService.connected$, { initialValue: false });

    // Toast notifications queue
    toasts = signal<Notification[]>([]);

    unreadCount = computed(() =>
        this.notifications().filter((n: Notification) => !n.read).length
    );

    async togglePush(event: Event) {
        event.stopPropagation();
        if (this.pushService.isSubscribed()) {
            await this.pushService.unsubscribeFromPush();
        } else {
            await this.pushService.subscribeToPush();
        }
    }

    async testPush(event: Event) {
        event.stopPropagation();
        await this.pushService.sendTestNotification();
    }

    private newNotifSub?: Subscription;

    ngOnInit(): void {
        this.newNotifSub = this.notificationService.newNotification$.subscribe(n => {
            this.showToast(n);
        });
    }

    ngOnDestroy(): void {
        this.newNotifSub?.unsubscribe();
    }

    @HostListener('document:click')
    closeDropdown() {
        this.isOpen.set(false);
    }

    toggleDropdown(event: Event) {
        this.isOpen.update(v => !v);
        event.stopPropagation();
    }

    markAsRead(id: string) {
        this.notificationService.markAsRead(id);
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead();
    }

    clearAll() {
        this.notificationService.clearAll();
    }

    getIcon(type: Notification['type']): string {
        return this.notificationService.getTypeIcon(type);
    }

    getColor(type: Notification['type']): string {
        return this.notificationService.getTypeColor(type);
    }

    private showToast(n: Notification): void {
        this.toasts.update(t => [n, ...t].slice(0, 3)); // max 3 toasts
        setTimeout(() => {
            this.toasts.update(t => t.filter(x => x.id !== n.id));
        }, 5000);
    }

    dismissToast(id: string): void {
        this.toasts.update(t => t.filter(x => x.id !== id));
    }
}
