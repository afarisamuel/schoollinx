import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { SeoService } from '../../../shared/services/seo';
import { getTenantSubdomain } from '../../../core/utils/tenant.util';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  resetPasswordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });
  
  token = signal<string | null>(null);
  isLoading = signal(false);
  message = signal('');
  error = signal('');
  isSuccess = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  tenantName = signal('School Portal');
  tenantLogo = signal('');

  passwordStrength = computed(() => {
    const pwd = this.resetPasswordForm.get('password')?.value || '';
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 66, label: 'Good', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  });

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Reset Password - SchoolLinx',
      description: 'Create a new secure password for your institutional account.',
      noindex: true
    });

    if (isPlatformBrowser(this.platformId)) {
      this.loadTenantInfo();
    }

    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    this.token.set(tokenParam);
    if (!tokenParam) {
      this.error.set('Invalid or missing password reset token. Please request a new recovery link.');
    }
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(v => !v);
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
    const currentToken = this.token();
    if (this.resetPasswordForm.invalid || !currentToken) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.message.set('');

    const { password } = this.resetPasswordForm.value;

    this.authService.resetPassword(currentToken, password).subscribe({
      next: (res) => {
        this.message.set(res.message || 'Your password has been reset successfully.');
        this.isSuccess.set(true);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'An error occurred while resetting your password. The link may have expired.');
        this.isLoading.set(false);
      }
    });
  }
}
