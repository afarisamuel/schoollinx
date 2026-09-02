import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Role } from '../../domain/user.model';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);
    private http = inject(HttpClient);

    constructor() {
        if (this.isBrowser) {
            this.loadUserFromToken();
        }
    }

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    private getSubdomainHeader(): Record<string, string> {
        if (!this.isBrowser) return {};
        
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        
        // Basic check: if hostname is trust.localhost or school.schoollinx.com
        let subdomain = '';
        if (parts.length >= 2) {
            subdomain = parts[0];
            // Ignore common top-levels/non-tenants
            if (subdomain === 'www' || subdomain === 'localhost' || subdomain === '127') {
                subdomain = '';
            }
        }
        
        return subdomain ? { 'X-Tenant-Subdomain': subdomain } : {};
    }

    login(identifier: string, password: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/login`, { identifier, password }, { 
            headers: this.getSubdomainHeader() 
        });
    }

    requestOTP(phoneNumber: string): Observable<{ message: string; phone_masked: string; expires_in: number }> {
        return this.http.post<{ message: string; phone_masked: string; expires_in: number }>(
            `${environment.apiUrl}/auth/otp/request`,
            { phone_number: phoneNumber },
            { headers: this.getSubdomainHeader() }
        );
    }

    verifyOTP(phoneNumber: string, otp: string): Observable<any> {
        return this.http.post<any>(
            `${environment.apiUrl}/auth/otp/verify`,
            { phone_number: phoneNumber, otp },
            { headers: this.getSubdomainHeader() }
        );
    }

    login2FA(pendingToken: string, token: string): Observable<any> {
        const headers = {
            ...this.getSubdomainHeader(),
            'Authorization': `Bearer ${pendingToken}`
        };
        return this.http.post<any>(`${environment.apiUrl}/auth/2fa/login`, { token }, { headers });
    }

    setup2FA(): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/2fa/setup`, {}, {
            headers: this.getSubdomainHeader()
        });
    }

    verify2FA(token: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/2fa/verify`, { token }, {
            headers: this.getSubdomainHeader()
        });
    }

    signup(data: any): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/signup`, data, { 
            headers: this.getSubdomainHeader() 
        });
    }

    setupPassword(token: string, newPassword: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/setup-password`, { token, new_password: newPassword }, { 
            headers: this.getSubdomainHeader() 
        });
    }

    forgotPassword(email: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email }, {
            headers: this.getSubdomainHeader()
        });
    }

    resetPassword(token: string, newPassword: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, { token, new_password: newPassword }, {
            headers: this.getSubdomainHeader()
        });
    }

    changePassword(oldPassword: string, newPassword: string): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/auth/change-password`, { old_password: oldPassword, new_password: newPassword }, { 
            headers: this.getSubdomainHeader() 
        });
    }

    handleLoginSuccess(token: string, tenantSubdomain?: string) {
        if (this.isBrowser) {
            localStorage.setItem('jwt_token', token);
            if (tenantSubdomain) {
                localStorage.setItem('tenant_subdomain', tenantSubdomain);
            }
            this.loadUserFromToken();
        }
    }

    logout() {
        if (this.isBrowser) {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('tenant_subdomain');
        }
        this.currentUserSubject.next(null);
    }

    public getToken(): string | null {
        if (this.isBrowser) {
            return localStorage.getItem('jwt_token');
        }
        return null;
    }

    private loadUserFromToken() {
        const token = this.getToken();
        if (token) {
            try {
                // Safe JWT decode for payload (Base64Url support)
                const base64Url = token.split('.')[1];
                if (!base64Url) throw new Error('Invalid token format');
                
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                const user: User = {
                    id: payload.user_id,
                    username: payload.username || '',
                    email: payload.email || '',
                    role: payload.role as Role
                };
                this.currentUserSubject.next(user);
            } catch (e) {
                console.error('Failed to decode existing token:', e);
                this.logout();
            }
        } else {
            this.currentUserSubject.next(null);
        }
    }
}
