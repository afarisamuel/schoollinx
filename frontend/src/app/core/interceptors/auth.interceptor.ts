import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../infrastructure/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    // Skip attaching token for unauthenticated auth endpoints
    const unauthenticatedAuthRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/setup-password'];
    const isUnauthenticatedAuthRequest = unauthenticatedAuthRoutes.some(route => req.url.includes(route));

    let authReq = req;
    if (token && !isUnauthenticatedAuthRequest) {
        authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isUnauthenticatedAuthRequest) {
                // Token expired or invalid — clear session and redirect
                authService.logout();
                router.navigate(['/login']);
            } else if (error.status === 402) {
                // Billing overdue — dispatch event to trigger lock screen
                window.dispatchEvent(new Event('billing-locked'));
            }
            return throwError(() => error);
        })
    );
};
