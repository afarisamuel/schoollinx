import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../../core/infrastructure/cookie-consent/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.css',
})
export class CookieConsentComponent {
  private svc = inject(CookieConsentService);

  status = this.svc.status;
  showDetails = signal(false);

  // Per-category toggles (mirrors service preferences, excluding necessary)
  analytics  = signal(false);
  marketing  = signal(false);
  preferences = signal(false);

  openDetails() {
    // Seed toggles from current prefs when opening
    const p = this.svc.preferences();
    this.analytics.set(p.analytics);
    this.marketing.set(p.marketing);
    this.preferences.set(p.preferences);
    this.showDetails.set(true);
  }

  closeDetails() {
    this.showDetails.set(false);
  }

  acceptAll() {
    this.svc.acceptAll();
    this.showDetails.set(false);
  }

  declineAll() {
    this.svc.declineAll();
    this.showDetails.set(false);
  }

  saveCustom() {
    this.svc.saveCustom({
      analytics: this.analytics(),
      marketing: this.marketing(),
      preferences: this.preferences(),
    });
    this.showDetails.set(false);
  }
}
