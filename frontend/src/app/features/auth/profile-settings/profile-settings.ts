import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
})
export class ProfileSettings implements OnInit {
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;
  setupUrl: string = '';
  qrCodeImageUrl: SafeUrl | null = null;
  qrCodeVisible: boolean = false;
  verificationCode: string = '';
  loading: boolean = false;
  error: string = '';
  success: string = '';

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });
  }

  enable2FA() {
    this.loading = true;
    this.error = '';
    
    this.authService.setup2FA().subscribe({
      next: (res) => {
        this.setupUrl = res.url;
        // Generate QR code image URL using the free QR server API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.url || '')}`;
        this.qrCodeImageUrl = this.sanitizer.bypassSecurityTrustUrl(qrApiUrl);
        this.qrCodeVisible = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to setup 2FA';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  verify2FA() {
    if (!this.verificationCode || this.verificationCode.length !== 6) return;
    this.loading = true;
    this.error = '';

    this.authService.verify2FA(this.verificationCode).subscribe({
      next: () => {
        this.success = 'Two-Factor Authentication successfully enabled!';
        this.qrCodeVisible = false;
        this.loading = false;
        if (this.user) {
          this.user.two_factor_enabled = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Invalid verification code';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
