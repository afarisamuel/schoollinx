import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    loginForm: FormGroup;
    twoFaForm: FormGroup;

    readonly loading     = signal(false);
    readonly error       = signal('');
    readonly tenantName  = signal('School Portal');
    readonly requires2FA = signal(false);
    readonly pendingToken = signal('');

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.loadTenantName();
        }
        this.loginForm = this.fb.group({
            identifier: ['', Validators.required],
            password: ['', Validators.required]
        });
        this.twoFaForm = this.fb.group({
            token: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
        });
    }

    private getSubdomain(): string {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        // 1. Try URL subdomain (e.g. school.schoollinx.com or school.localhost)
        if (parts.length >= 2) {
            const sub = parts[0];
            if (sub !== 'www' && sub !== 'localhost' && sub !== '127') {
                return sub;
            }
        }

        // 2. Fall back to localStorage (matches the tenant interceptor's fallback,
        //    used during local dev on plain localhost)
        return localStorage.getItem('tenant_subdomain') || '';
    }

    private loadTenantName() {
        const subdomain = this.getSubdomain();
        if (!subdomain) {
            this.tenantName.set('School Portal');
            return;
        }

        // Optimistically show a formatted subdomain while the request is in-flight
        this.tenantName.set(subdomain.charAt(0).toUpperCase() + subdomain.slice(1));

        // The tenant interceptor will also attach X-Tenant-Subdomain automatically,
        // but we set it explicitly here too for clarity.
        this.http.get<{ name: string; subdomain: string; logo_url: string }>(
            '/api/public/tenant-info',
            { headers: { 'X-Tenant-Subdomain': subdomain } }
        ).subscribe({
            next: (info) => this.tenantName.set(info.name),
            error: (err) => {
                // Keeps the formatted subdomain as fallback; log for debugging
                console.error('[Login] Could not fetch tenant name:', err?.status, err?.error);
            }
        });
    }

    onSubmit() {
        if (this.loginForm.invalid) return;
        this.loading.set(true);
        this.error.set('');

        const { identifier, password } = this.loginForm.value;
        this.authService.login(identifier, password).subscribe({
            next: (res: any) => {
                if (res.requires_2fa) {
                    this.requires2FA.set(true);
                    this.pendingToken.set(res.token);
                    this.loading.set(false);
                } else {
                    this.authService.handleLoginSuccess(res.token, res.tenant_subdomain);
                    if (res.must_change_password) {
                        this.router.navigate(['/change-password']);
                    } else {
                        this.navigateByRole();
                    }
                }
            },
            error: (err) => {
                this.error.set(err.error?.error || 'Invalid credentials');
                this.loading.set(false);
            }
        });
    }

    on2FASubmit() {
        if (this.twoFaForm.invalid) return;
        this.loading.set(true);
        this.error.set('');

        const token = this.twoFaForm.value.token;
        this.authService.login2FA(this.pendingToken(), token).subscribe({
            next: (res: any) => {
                this.authService.handleLoginSuccess(res.token, res.tenant_subdomain);
                if (res.must_change_password) {
                    this.router.navigate(['/change-password']);
                } else {
                    this.navigateByRole();
                }
            },
            error: (err) => {
                this.error.set(err.error?.error || 'Invalid 2FA token');
                this.loading.set(false);
            }
        });
    }

    private navigateByRole() {
        const role = this.authService.currentUserValue?.role;
        if (role === 'GUARDIAN') {
            this.router.navigate(['/parents']);
        } else if (role === 'STUDENT') {
            this.router.navigate(['/portal']);
        } else {
            this.router.navigate(['/dashboard']);
        }
    }
}

