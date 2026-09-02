import { Component, Inject, PLATFORM_ID, signal, OnDestroy } from '@angular/core';
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
export class LoginComponent implements OnDestroy {
    loginForm: FormGroup;
    twoFaForm: FormGroup;
    phoneForm: FormGroup;
    otpForm: FormGroup;

    readonly loading     = signal(false);
    readonly error       = signal('');
    readonly successMsg  = signal('');
    readonly tenantName  = signal('School Portal');
    readonly requires2FA = signal(false);
    readonly pendingToken = signal('');

    // Phone OTP login state
    readonly loginMode   = signal<'password' | 'otp'>('password');
    readonly otpStep     = signal<'phone' | 'code'>('phone');
    readonly maskedPhone = signal('');
    readonly countdown   = signal(0);
    private timerHandle: any = null;

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
        this.phoneForm = this.fb.group({
            phoneNumber: ['', [Validators.required, Validators.minLength(9)]]
        });
        this.otpForm = this.fb.group({
            otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
        });
    }

    ngOnDestroy() {
        this.clearTimer();
    }

    switchMode(mode: 'password' | 'otp') {
        this.loginMode.set(mode);
        this.error.set('');
        this.successMsg.set('');
        if (mode === 'password') {
            this.otpStep.set('phone');
            this.clearTimer();
        }
    }

    private getSubdomain(): string {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        if (parts.length >= 2) {
            const sub = parts[0];
            if (sub !== 'www' && sub !== 'localhost' && sub !== '127') {
                return sub;
            }
        }

        return localStorage.getItem('tenant_subdomain') || '';
    }

    private loadTenantName() {
        const subdomain = this.getSubdomain();
        if (!subdomain) {
            this.tenantName.set('School Portal');
            return;
        }

        this.tenantName.set(subdomain.charAt(0).toUpperCase() + subdomain.slice(1));

        this.http.get<{ name: string; subdomain: string; logo_url: string }>(
            '/api/public/tenant-info',
            { headers: { 'X-Tenant-Subdomain': subdomain } }
        ).subscribe({
            next: (info) => this.tenantName.set(info.name),
            error: (err) => {
                console.error('[Login] Could not fetch tenant name:', err?.status, err?.error);
            }
        });
    }

    onSubmit() {
        if (this.loginForm.invalid) return;
        this.loading.set(true);
        this.error.set('');
        this.successMsg.set('');

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

    onRequestOTP() {
        if (this.phoneForm.invalid) return;
        this.loading.set(true);
        this.error.set('');
        this.successMsg.set('');

        const rawPhone = this.phoneForm.value.phoneNumber.trim();
        this.authService.requestOTP(rawPhone).subscribe({
            next: (res) => {
                this.loading.set(false);
                this.maskedPhone.set(res.phone_masked || rawPhone);
                this.otpStep.set('code');
                this.successMsg.set('Verification code sent via SMS!');
                this.startCountdown(60);
                this.otpForm.reset();
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.error || 'Failed to send verification code. Please check your phone number.');
            }
        });
    }

    onVerifyOTP() {
        if (this.otpForm.invalid) return;
        this.loading.set(true);
        this.error.set('');
        this.successMsg.set('');

        const rawPhone = this.phoneForm.value.phoneNumber.trim();
        const code = this.otpForm.value.otp.trim();

        this.authService.verifyOTP(rawPhone, code).subscribe({
            next: (res: any) => {
                this.authService.handleLoginSuccess(res.token, res.tenant_subdomain);
                if (res.must_change_password) {
                    this.router.navigate(['/change-password']);
                } else {
                    this.navigateByRole();
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.error.set(err.error?.error || 'Invalid verification code');
            }
        });
    }

    onResendOTP() {
        if (this.countdown() > 0 || this.loading()) return;
        this.onRequestOTP();
    }

    changePhoneNumber() {
        this.otpStep.set('phone');
        this.error.set('');
        this.successMsg.set('');
        this.clearTimer();
    }

    private startCountdown(seconds: number) {
        this.clearTimer();
        this.countdown.set(seconds);
        this.timerHandle = setInterval(() => {
            const next = this.countdown() - 1;
            if (next <= 0) {
                this.countdown.set(0);
                this.clearTimer();
            } else {
                this.countdown.set(next);
            }
        }, 1000);
    }

    private clearTimer() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
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


