import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/system/auth`;

  currentUser = signal<User | null>(null);
  token = signal<string | null>(localStorage.getItem('admin_token'));

  constructor() {
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      this.currentUser.set(JSON.parse(savedUser));
    }
  }

  private getSubdomainHeader(): { [key: string]: string } {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    let subdomain = '';
    
    if (parts.length >= 2) {
      subdomain = parts[0];
      if (subdomain === 'www' || subdomain === 'localhost' || subdomain === '127') {
        subdomain = '';
      }
    }
    
    return subdomain ? { 'X-Tenant-Subdomain': subdomain } : {};
  }

  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials, {
      headers: this.getSubdomainHeader()
    }).pipe(
      tap(res => {
        if (res.user.role === 'ECOPOWER_ADMIN') {
          this.setSession(res);
        } else {
          throw new Error('Unauthorized: Only system administrators can access this portal.');
        }
      })
    );
  }

  signup(data: any): Observable<LoginResponse> {
    const payload = { ...data, role: 'ECOPOWER_ADMIN' };
    return this.http.post<LoginResponse>(`${this.apiUrl}/signup`, payload, {
      headers: this.getSubdomainHeader()
    }).pipe(
      tap(res => this.setSession(res))
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }, {
      headers: this.getSubdomainHeader()
    });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, new_password: newPassword }, {
      headers: this.getSubdomainHeader()
    });
  }

  private setSession(authResult: LoginResponse) {
    localStorage.setItem('admin_token', authResult.token);
    localStorage.setItem('admin_user', JSON.stringify(authResult.user));
    this.token.set(authResult.token);
    this.currentUser.set(authResult.user);
  }

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }
}
