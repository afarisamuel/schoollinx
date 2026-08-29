import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number; // in milliseconds
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private recentToasts = new Map<string, number>();

  private isTechnicalError(msg: string): boolean {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes('sqlstate') ||
      lower.includes('error:') ||
      lower.includes('pq:') ||
      lower.includes('violates foreign key') ||
      lower.includes('violates') ||
      lower.includes('constraint') ||
      lower.includes('syntax error') ||
      lower.includes('relation ') ||
      lower.includes('table ') ||
      lower.includes('column ') ||
      lower.includes('database error') ||
      lower.includes('gorm query error') ||
      lower.includes('panic')
    );
  }

  show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000) {
    let cleanMessage = message || '';
    let cleanTitle = title;

    // Sanitize technical internal errors into standard friendly messages
    if (type === 'error' && this.isTechnicalError(cleanMessage)) {
      cleanTitle = 'Server Error';
      cleanMessage = 'A server error occurred. Please try again later.';
    }

    const defaultTitle = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice'
    }[type];

    const finalTitle = cleanTitle || defaultTitle;

    // Prevent duplicate toast if the exact same message was shown in the last 2 seconds
    const dedupKey = `${type}:${finalTitle}:${cleanMessage}`;
    const now = Date.now();
    const lastShown = this.recentToasts.get(dedupKey);
    if (lastShown && now - lastShown < 2000) {
      return '';
    }
    this.recentToasts.set(dedupKey, now);

    const id = 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + now;

    const toast: Toast = {
      id,
      type,
      title: finalTitle,
      message: cleanMessage,
      duration,
      timestamp: now
    };

    // Keep maximum 4 toasts visible at a time
    this.toasts.update(current => [toast, ...current].slice(0, 4));

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title: string = 'Success', duration: number = 4000) {
    return this.show(message, 'success', title, duration);
  }

  error(message: string, title: string = 'Error', duration: number = 5000) {
    return this.show(message, 'error', title, duration);
  }

  warning(message: string, title: string = 'Warning', duration: number = 4500) {
    return this.show(message, 'warning', title, duration);
  }

  info(message: string, title: string = 'Notice', duration: number = 4000) {
    return this.show(message, 'info', title, duration);
  }

  remove(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
