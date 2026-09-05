import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../../environments/environment';

export interface Notification {
    id: string;
    type: 'ATTENDANCE' | 'GRADE' | 'SYSTEM' | 'PAYMENT' | 'HOMEWORK' | 'MESSAGE';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    data?: any;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    private socket?: WebSocket;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private reconnectDelay = 3000;
    private maxReconnectDelay = 30000;
    private shouldReconnect = false;

    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    private newNotificationSubject = new Subject<Notification>();
    public newNotification$ = this.newNotificationSubject.asObservable();

    // Track connection state for UI feedback
    private connectedSubject = new BehaviorSubject<boolean>(false);
    public connected$ = this.connectedSubject.asObservable();

    private currentUserId: string = '';

    constructor() {
        if (this.isBrowser) {
            this.authService.currentUser$.subscribe(user => {
                if (user) {
                    this.currentUserId = user.id || user.email || 'operator';
                    this.shouldReconnect = true;
                    // Restore from local cache immediately for instant visibility
                    this.restoreCachedNotifications();
                    this.connect();
                    this.loadInitialNotifications();
                } else {
                    this.shouldReconnect = false;
                    this.disconnect();
                }
            });
        }
    }

    private getStorageKey(): string {
        return `schoollinx_notifications_${this.currentUserId || 'default'}`;
    }

    private restoreCachedNotifications() {
        if (!this.isBrowser) return;
        try {
            const raw = localStorage.getItem(this.getStorageKey());
            if (raw) {
                const parsed: Notification[] = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.notificationsSubject.next(parsed);
                }
            }
        } catch (e) {
            console.warn('Failed to restore cached notifications', e);
        }
    }

    private persistNotifications(notifs: Notification[]) {
        if (!this.isBrowser) return;
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(notifs.slice(0, 100)));
        } catch (e) {
            console.warn('Failed to persist notifications', e);
        }
    }

    public loadInitialNotifications() {
        const token = this.authService.getToken();
        if (!token) return;

        this.http.get<Notification[]>('/api/notifications?limit=50').subscribe({
            next: (data) => {
                if (Array.isArray(data)) {
                    const existing = this.notificationsSubject.value;
                    // Merge and deduplicate by ID
                    const map = new Map<string, Notification>();
                    existing.forEach(n => map.set(n.id, n));
                    data.forEach(n => map.set(n.id, n));

                    const merged = Array.from(map.values()).sort((a, b) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    ).slice(0, 50);

                    this.notificationsSubject.next(merged);
                    this.persistNotifications(merged);
                }
            },
            error: (err) => console.warn('Could not fetch notifications from API:', err)
        });
    }

    private connect() {
        if (this.socket?.readyState === WebSocket.OPEN) return;

        const token = this.authService.getToken();
        if (!token) return;

        let tenant = '';
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            tenant = parts[0];
            if (tenant === 'www' || tenant === 'localhost' || tenant === '127') {
                tenant = '';
            }
        }
        if (!tenant && typeof localStorage !== 'undefined') {
            tenant = localStorage.getItem('schoollinx_tenant_subdomain') || '';
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let apiHost = '';
        if (environment.apiUrl.startsWith('http')) {
            apiHost = new URL(environment.apiUrl).host;
        } else {
            apiHost = window.location.host;
        }

        const wsUrl = `${wsProtocol}//${apiHost}/api/ws?token=${token}&tenant=${tenant}`;

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                this.connectedSubject.next(true);
                this.reconnectDelay = 3000;
            };

            this.socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'notification' && msg.payload) {
                        this.addNotification(msg.payload as Notification);
                    } else if (msg.title && msg.message) {
                        this.addNotification(msg as Notification);
                    }
                } catch (e) {
                    console.warn('Failed to parse WS message:', e);
                }
            };

            this.socket.onclose = () => {
                this.connectedSubject.next(false);
                this.socket = undefined;
                if (this.shouldReconnect) {
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = () => {
                this.connectedSubject.next(false);
            };
        } catch (err) {
            console.warn('WebSocket connection error:', err);
            this.connectedSubject.next(false);
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (this.shouldReconnect) {
                this.connect();
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
            }
        }, this.reconnectDelay);
    }

    public disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.socket?.close();
        this.socket = undefined;
        this.connectedSubject.next(false);
    }

    private addNotification(n: Notification) {
        if (!n.read) n.read = false;
        if (!n.created_at) n.created_at = new Date().toISOString();
        const current = this.notificationsSubject.value;
        if (current.some(existing => existing.id === n.id)) return;
        
        const updated = [n, ...current].slice(0, 50);
        this.notificationsSubject.next(updated);
        this.persistNotifications(updated);
        this.newNotificationSubject.next(n);
    }

    markAsRead(id: string) {
        const current = this.notificationsSubject.value;
        const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
        this.notificationsSubject.next(updated);
        this.persistNotifications(updated);

        this.http.put(`/api/notifications/${id}/read`, {}).subscribe({
            error: (err) => console.warn('Failed to mark notification as read:', err)
        });
    }

    markAllAsRead() {
        const current = this.notificationsSubject.value;
        const updated = current.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(updated);
        this.persistNotifications(updated);

        this.http.put('/api/notifications/read-all', {}).subscribe({
            error: (err) => console.warn('Failed to mark all notifications as read:', err)
        });
    }

    clearAll() {
        this.notificationsSubject.next([]);
        if (this.isBrowser) {
            localStorage.removeItem(this.getStorageKey());
        }
    }

    getTypeIcon(type: Notification['type']): string {
        return '';
    }

    getTypeColor(type: Notification['type']): string {
        const colors: Record<string, string> = {
            'ATTENDANCE': '#f59e0b',
            'GRADE': '#6366f1',
            'PAYMENT': '#10b981',
            'HOMEWORK': '#8b5cf6',
            'MESSAGE': '#3b82f6',
            'SYSTEM': '#64748b',
        };
        return colors[type] || '#64748b';
    }
}
