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

  show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000) {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const defaultTitle = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice'
    }[type];

    const toast: Toast = {
      id,
      type,
      title: title || defaultTitle,
      message,
      duration,
      timestamp: Date.now()
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

  error(message: string, title: string = 'Action Failed', duration: number = 5000) {
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
