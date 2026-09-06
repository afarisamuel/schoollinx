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
    } catch (err) {
      console.warn('Service Worker registration or Push check skipped:', err);
    }
  }

  private urlB64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  }

  async subscribeToPush(): Promise<boolean> {
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

      // 1. Fetch VAPID public key from backend
      const res = await firstValueFrom(
        this.http.get<{ publicKey: string }>(`${this.apiUrl}/notifications/push/vapid-public-key`)
      );

      if (!res?.publicKey) {
        throw new Error('Could not retrieve VAPID public key from server.');
      }

      // 2. Register Service Worker & Subscribe with PushManager
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlB64ToUint8Array(res.publicKey)
        });
      }

      // 3. Post subscription to backend
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
      return true;
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
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

  async sendTestNotification(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/notifications/push/test`, {})
    );
  }
}
