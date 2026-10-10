import { Component, Inject, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { SeoService } from '../../../shared/services/seo';
import { getTenantSubdomain } from '../../../core/utils/tenant.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });
  
  readonly isLoading = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly tenantName = signal('School Portal');
  readonly tenantLogo = signal('');

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Reset Password - SchoolLinx',
      description: 'Request a password reset link for your account.',
      noindex: true
    });

    if (isPlatformBrowser(this.platformId)) {
      this.loadTenantInfo();
    }
  }

  private loadTenantInfo() {
    const subdomain = getTenantSubdomain();
    if (!subdomain) {
      this.tenantName.set('SchoolLinx');
      return;
    }

    this.tenantName.set(subdomain.charAt(0).toUpperCase() + subdomain.slice(1));

    this.http.get<{ name: string; subdomain: string; logo_url?: string }>(
      '/api/public/tenant-info',
      { headers: { 'X-Tenant-Subdomain': subdomain } }
    ).subscribe({
      next: (info) => {
        if (info?.name) this.tenantName.set(info.name);
        if (info?.logo_url) this.tenantLogo.set(info.logo_url);
      },
      error: () => {}
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.message.set('');

    const { email } = this.forgotPasswordForm.value;

    this.authService.forgotPassword(email.trim()).subscribe({
      next: (res) => {
        this.message.set(res.message || 'If an account exists with that email, a password reset link has been dispatched.');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'An unexpected error occurred. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}

