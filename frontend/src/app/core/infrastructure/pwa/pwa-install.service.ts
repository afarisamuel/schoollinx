import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DISMISS_KEY = 'schoollinx_pwa_dismissed_until';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  public readonly isStandalone = signal<boolean>(false);
  public readonly isIOS = signal<boolean>(false);
  public readonly canNativeInstall = signal<boolean>(false);
  public readonly showPrompt = signal<boolean>(false);
  public readonly showIOSInstructions = signal<boolean>(false);

  constructor() {
    if (this.isBrowser) {
      this.init();
    }
  }

  private init(): void {
    // Check if already running in standalone mode (installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    this.isStandalone.set(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    this.isIOS.set(isIosDevice);

    // Listen for the native PWA install prompt on Android/Chrome/Edge/Desktop
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canNativeInstall.set(true);

      if (!this.isDismissedRecently()) {
        // Show floating prompt smoothly after a short delay
        setTimeout(() => {
          this.showPrompt.set(true);
        }, 2000);
      }
    });

    // If iOS and not dismissed, show prompt after delay
    if (isIosDevice && !this.isDismissedRecently()) {
      setTimeout(() => {
        this.showPrompt.set(true);
      }, 3000);
    }

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canNativeInstall.set(false);
      this.showPrompt.set(false);
      this.isStandalone.set(true);
    });
  }

  public async install(): Promise<boolean> {
    if (this.isIOS()) {
      this.showIOSInstructions.set(true);
      return false;
    }

    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canNativeInstall.set(false);
      this.showPrompt.set(false);
      return choice.outcome === 'accepted';
    } catch {
      return false;
    }
  }

  public dismiss(cooldownDays = 3): void {
    this.showPrompt.set(false);
    this.showIOSInstructions.set(false);
    if (this.isBrowser) {
      const expiry = Date.now() + cooldownDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, expiry.toString());
    }
  }

  public openPrompt(): void {
    this.showPrompt.set(true);
  }

  public closePrompt(): void {
    this.showPrompt.set(false);
    this.showIOSInstructions.set(false);
  }

  private isDismissedRecently(): boolean {
    if (!this.isBrowser) return false;
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (!dismissedUntil) return false;
    const expiry = parseInt(dismissedUntil, 10);
    return !isNaN(expiry) && Date.now() < expiry;
  }
}
