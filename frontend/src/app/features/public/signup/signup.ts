import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  private http = inject(HttpClient);

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
  currentYear = new Date().getFullYear();

  steps = [
    { number: 1, label: 'School', icon: 'school' },
    { number: 2, label: 'Account', icon: 'account' },
    { number: 3, label: 'Plan', icon: 'plan' },
    { number: 4, label: 'Review', icon: 'review' }
  ];

  progressWidth = computed(() => `${((this.currentStep() - 1) / (this.totalSteps - 1)) * 100}%`);

  // Auto-generate a subdomain hint based on school name
  generateSubdomain() {
    if (!this.form.subdomain && this.form.name) {
      this.form.subdomain = this.form.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
    }
  }

  get step1Valid(): boolean {
    return this.form.name.trim().length > 0 && this.form.subdomain.trim().length > 0;
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

    this.http.post('/api/public/tenants/register', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
