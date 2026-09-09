import { Injectable, signal } from '@angular/core';

export type CookieConsentStatus = 'pending' | 'accepted' | 'declined';

export interface CookiePreferences {
  necessary: true;       // always true — non-negotiable
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const STORAGE_KEY = 'sl_cookie_consent';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  /** 'pending' = banner visible, 'accepted'/'declined' = banner hidden */
  status = signal<CookieConsentStatus>('pending');
  preferences = signal<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { status: CookieConsentStatus; prefs: CookiePreferences };
      this.status.set(parsed.status);
      this.preferences.set({ ...parsed.prefs, necessary: true });
    } catch { /* ignore */ }
  }

  acceptAll() {
    const prefs: CookiePreferences = { necessary: true, analytics: true, marketing: true, preferences: true };
    this.save('accepted', prefs);
  }

  declineAll() {
    const prefs: CookiePreferences = { necessary: true, analytics: false, marketing: false, preferences: false };
    this.save('declined', prefs);
  }

  saveCustom(prefs: Omit<CookiePreferences, 'necessary'>) {
    const full: CookiePreferences = { necessary: true, ...prefs };
    // If at least analytics is accepted, status = accepted, else declined
    const status: CookieConsentStatus = (prefs.analytics || prefs.marketing || prefs.preferences)
      ? 'accepted' : 'declined';
    this.save(status, full);
  }

  /** Reopen the banner to change preferences */
  openPreferences() {
    this.status.set('pending');
  }

  private save(status: CookieConsentStatus, prefs: CookiePreferences) {
    this.status.set(status);
    this.preferences.set(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, prefs }));
  }
}
