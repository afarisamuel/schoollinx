import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || '/api';

  readonly isSupported = signal<boolean>(
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );

  readonly permission = signal<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  readonly isSubscribed = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly showPrompt = signal<boolean>(false);
  readonly latestNotification = signal<{ title: string; body: string; data?: Record<string, any>; receivedAt: number } | null>(null);

  constructor() {
    if (this.isSupported()) {
      this.init();
    }
  }

  async init(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) return;

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const sub = await reg.pushManager.getSubscription();
      this.isSubscribed.set(!!sub);
      this.permission.set(Notification.permission);

      // If user already granted permission, ensure their fresh device token is registered with server
      if (Notification.permission === 'granted') {
        this.subscribeStandardWebPush().catch(() => {});
      } else {
        this.checkAndPrompt();
      }
    } catch (err) {
      console.warn('Service Worker registration or Push check skipped:', err);
    }
  }


  checkAndPrompt(): void {
    if (!this.isSupported()) return;

    const perm = Notification.permission;
    this.permission.set(perm);

    // If permission is not granted (i.e. 'default' or not yet subscribed)
    if (perm !== 'granted') {
      try {
        const isDismissed = sessionStorage.getItem('schoollinx_push_prompt_dismissed');
        if (!isDismissed) {
          // Delay briefly for smooth UI entry
          setTimeout(() => {
            this.showPrompt.set(true);
          }, 1200);
        }
      } catch {
        this.showPrompt.set(true);
      }
    }
  }

  dismissPrompt(snoozeSession = true): void {
    this.showPrompt.set(false);
    if (snoozeSession) {
      try {
        sessionStorage.setItem('schoollinx_push_prompt_dismissed', 'true');
      } catch {}
    }
  }

  openPrompt(): void {
    this.showPrompt.set(true);
  }

  private urlB64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as unknown as BufferSource;
  }

  private cachedVapidKey: string | null = null;

  async getVapidPublicKey(): Promise<string> {
    if (this.cachedVapidKey) {
      return this.cachedVapidKey;
    }
    const res = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${this.apiUrl}/notifications/push/vapid-public-key`)
    );
    if (!res?.publicKey) {
      throw new Error('Could not retrieve VAPID public key from server.');
    }
    this.cachedVapidKey = res.publicKey;
    return res.publicKey;
  }

  async subscribeToPush(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    return this.subscribeStandardWebPush();
  }


  async unsubscribeFromPush(): Promise<boolean> {
    this.isLoading.set(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await firstValueFrom(
            this.http.post(`${this.apiUrl}/notifications/push/unsubscribe`, { endpoint })
          ).catch(() => {});
        }
      }
      this.isSubscribed.set(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async subscribeWithFCM(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    this.isLoading.set(true);
    try {
      const perm = await Notification.requestPermission();
      this.permission.set(perm);
      if (perm !== 'granted') {
        this.isLoading.set(false);
        return false;
      }

      const { initializeApp, getApps } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApps()[0];
      const messaging = getMessaging(app);

      // Listen for foreground push messages
      try {
        onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);
          const title = payload.notification?.title || payload.data?.['title'] || 'SchoolLinx Alert';
          const body = payload.notification?.body || payload.data?.['body'] || '';
          
          this.latestNotification.set({
            title,
            body,
            data: payload.data,
            receivedAt: Date.now()
          });

          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            const icon = payload.notification?.icon || payload.data?.['logo_url'] || payload.data?.['icon'] || '/favicon.ico';
            const notif = new Notification(title, {
              body,
              icon,
              badge: icon,
              data: payload.data || { url: '/' }
            });
            notif.onclick = () => {
              window.focus();
              const url = (payload.data && payload.data['url']) ? payload.data['url'] : '/notifications';
              window.location.href = url;
            };
          }
        });
      } catch (e) {
        console.warn('FCM onMessage registration non-fatal notice:', e);
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = environment.firebase.vapidKey || (await this.getVapidPublicKey());

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: reg
      });

      if (!fcmToken) {
        throw new Error('No FCM registration token returned by Firebase.');
      }

      const success = await this.subscribeFCMToken(fcmToken, navigator.userAgent);
      if (success) {
        this.showPrompt.set(false);
        try {
          sessionStorage.setItem('schoollinx_push_prompt_dismissed', 'true');
        } catch {}
      }
      return success;
    } catch (err) {
      console.warn('FCM subscription failed, attempting standard WebPush fallback:', err);
      // Fallback
      return this.subscribeStandardWebPush();
    } finally {
      this.isLoading.set(false);
    }
  }

  private async subscribeStandardWebPush(): Promise<boolean> {
    const publicKey = await this.getVapidPublicKey();
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      try { await subscription.unsubscribe(); } catch {}
    }
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlB64ToUint8Array(publicKey)
    });
    const subJson = subscription.toJSON();
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/notifications/push/subscribe`, {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.['p256dh'] || '',
          auth: subJson.keys?.['auth'] || ''
        },
        user_agent: navigator.userAgent
      })
    );
    this.isSubscribed.set(true);
    this.showPrompt.set(false);
    try { sessionStorage.setItem('schoollinx_push_prompt_dismissed', 'true'); } catch {}
    return true;
  }

  async subscribeFCMToken(token: string, userAgent?: string): Promise<boolean> {
    if (!token) return false;
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/notifications/push/subscribe`, {
          endpoint: token,
          keys: {
            p256dh: '',
            auth: ''
          },
          user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'fcm-client')
        })
      );
      this.isSubscribed.set(true);
      return true;
    } catch (err) {
      console.error('Failed to register FCM push token:', err);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendTestNotification(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/notifications/push/test`, {})
    );
  }

  async getPreferences(): Promise<NotificationPreference> {
    return firstValueFrom(
      this.http.get<NotificationPreference>(`${this.apiUrl}/notifications/preferences`)
    );
  }

  async updatePreferences(pref: Partial<NotificationPreference>): Promise<NotificationPreference> {
    return firstValueFrom(
      this.http.put<NotificationPreference>(`${this.apiUrl}/notifications/preferences`, pref)
    );
  }

  async getSubscriptions(): Promise<DeviceSubscription[]> {
    return firstValueFrom(
      this.http.get<DeviceSubscription[]>(`${this.apiUrl}/notifications/push/subscriptions`)
    );
  }

  async removeSubscription(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/notifications/push/subscriptions/${id}`)
    );
  }
}

export interface NotificationPreference {
  id?: string;
  user_id?: string;
  attendance_alerts: boolean;
  grade_alerts: boolean;
  payment_alerts: boolean;
  message_alerts: boolean;
  announcement_alerts: boolean;
  welfare_alerts: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface DeviceSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}
