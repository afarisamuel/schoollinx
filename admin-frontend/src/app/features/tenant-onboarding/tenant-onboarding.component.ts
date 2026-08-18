import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenant-onboarding',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './tenant-onboarding.component.html',
  styles: []
})
export class TenantOnboardingComponent {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private router = inject(Router);

  onboardingForm: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  constructor() {
    this.onboardingForm = this.fb.group({
      name: ['', Validators.required],
      subdomain: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      admin_email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.onboardingForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.tenantService.onboardTenant(this.onboardingForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.onboardingForm.reset();
        this.router.navigate(['/tenants/registry']);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to onboard tenant due to a server error.');
        this.isSubmitting.set(false);
      }
    });
  }
}
