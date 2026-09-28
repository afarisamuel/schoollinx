import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent implements OnInit {
  private http = inject(HttpClient);
  private seo = inject(SeoService);

  currentStep = signal(1);
  totalSteps = 4;

  form = {
    name: '',
    subdomain: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
    subscription_plan: 'BASIC'
  };

  showPassword = false;
  showConfirmPassword = false;

  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  subdomainError = signal<string | null>(null);
  subdomainTouched = signal(false);
  currentYear = new Date().getFullYear();

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Deploy Your School Operating System — Registration',
      description: 'Create your school tenant in under 2 minutes. Provision a dedicated isolated database, customize grading formulas, and start free with zero commitment.',
      url: '/signup'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Sign Up', url: '/signup' }
    ]);
  }

  steps = [
    { number: 1, label: 'School Details', desc: 'Name & Custom URL' },
    { number: 2, label: 'Admin Account', desc: 'Secure Credentials' },
    { number: 3, label: 'Choose Plan', desc: 'Select Tier' },
    { number: 4, label: 'Review & Launch', desc: 'Instant Provisioning' }
  ];

  progressWidth = computed(() => `${((this.currentStep() - 1) / (this.totalSteps - 1)) * 100}%`);

  // Auto-generate a subdomain hint based on school name
  generateSubdomain() {
    if (!this.form.subdomain && this.form.name) {
      this.form.subdomain = this.form.name
        .toLowerCase()
        .replace(/[^a-z]/g, '')   // letters only — no numbers, no special chars
        .substring(0, 20);
      this.validateSubdomain(this.form.subdomain);
    }
  }

  // Real-time subdomain validator: lowercase letters only
  validateSubdomain(value: string) {
    this.subdomainTouched.set(true);
    if (!value || value.trim().length === 0) {
      this.subdomainError.set(null);
      return;
    }
    if (/[0-9]/.test(value)) {
      this.subdomainError.set('Numbers are not allowed in the subdomain.');
      return;
    }
    if (/[^a-z]/.test(value)) {
      this.subdomainError.set('Only lowercase letters are allowed — no special characters.');
      return;
    }
    if (value.length < 3) {
      this.subdomainError.set('Subdomain must be at least 3 characters.');
      return;
    }
    this.subdomainError.set(null);
  }

  get step1Valid(): boolean {
    return (
      this.form.name.trim().length > 0 &&
      this.form.subdomain.trim().length >= 3 &&
      this.subdomainError() === null
    );
  }

  get step2Valid(): boolean {
    return (
      this.form.admin_email.trim().length > 0 &&
      this.form.admin_password.length >= 8 &&
      this.form.admin_password === this.form.confirm_password
    );
  }

  get step3Valid(): boolean {
    return this.form.subscription_plan !== '';
  }

  nextStep() {
    if (this.currentStep() === 1 && !this.step1Valid) {
      this.errorMessage.set('Please fill in all school details.');
      return;
    }
    if (this.currentStep() === 2 && !this.step2Valid) {
      if (this.form.admin_password.length < 8) {
        this.errorMessage.set('Password must be at least 8 characters.');
      } else if (this.form.admin_password !== this.form.confirm_password) {
        this.errorMessage.set('Passwords do not match.');
      } else {
        this.errorMessage.set('Please complete all account details.');
      }
      return;
    }
    if (this.currentStep() === 3 && !this.step3Valid) {
      this.errorMessage.set('Please select a subscription plan.');
      return;
    }
    this.errorMessage.set(null);
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    this.errorMessage.set(null);
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  getPortalUrl(): string {
    if (typeof window === 'undefined') return '/login';
    const subdomain = this.form.subdomain.trim().toLowerCase();
    if (!subdomain) return '/login';

    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;

    // Local development (localhost, 127.0.0.1)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${subdomain}.localhost${port}/login`;
    }

    // Production / Staging domain handling (e.g. schoollinx.com)
    const parts = hostname.split('.');
    let baseDomain = hostname;
    if (parts.length >= 2) {
      baseDomain = parts.slice(-2).join('.');
    }
    return `${protocol}//${subdomain}.${baseDomain}${port}/login`;
  }

  launchPortal() {
    const subdomain = this.form.subdomain.trim().toLowerCase();
    if (typeof window !== 'undefined') {
      if (subdomain) {
        localStorage.setItem('tenant_subdomain', subdomain);
      }
      window.location.href = this.getPortalUrl();
    }
  }

  onSubmit() {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.form.name,
      subdomain: this.form.subdomain,
      admin_email: this.form.admin_email,
      admin_password: this.form.admin_password,
      subscription_plan: this.form.subscription_plan
    };

    this.http.post(`${environment.apiUrl}/public/tenants/register`, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        if (typeof window !== 'undefined' && this.form.subdomain) {
          localStorage.setItem('tenant_subdomain', this.form.subdomain.trim().toLowerCase());
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
