import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './change-password.component.html',
    styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
    changePasswordForm: FormGroup;
    loading = false;
    error = '';
    tenantName = 'School Linx';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.setTenantName();
        }
        this.changePasswordForm = this.fb.group({
            old_password: ['', Validators.required],
            new_password: ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    private passwordMatchValidator(g: FormGroup) {
        return g.get('new_password')?.value === g.get('confirm_password')?.value
            ? null : { mismatch: true };
    }

    private setTenantName() {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            const subdomain = parts[0];
            if (subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== '127') {
                this.tenantName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
            }
        }
    }

    onSubmit() {
        if (this.changePasswordForm.invalid) return;
        this.loading = true;
        this.error = '';

        const { old_password, new_password } = this.changePasswordForm.value;
        this.authService.changePassword(old_password, new_password).subscribe({
            next: () => {
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.error = err.error?.error || 'Failed to change password';
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
            }
        });
    }
}
