import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.token();

    // Skip attaching token for unauthenticated auth endpoints
    const unauthenticatedAuthRoutes = ['/api/system/auth/login', '/api/system/auth/signup', '/api/system/auth/setup-password'];
    const isUnauthenticatedAuthRequest = unauthenticatedAuthRoutes.some(route => req.url.includes(route));

    let authReq = req;

    // Rewrite relative API URLs to absolute API URLs
    if (req.url.startsWith('/api')) {
        authReq = req.clone({
            url: `${environment.apiUrl}${req.url.substring(4)}`
        });
        req = authReq; // Update req so subsequent clones use the new URL
    }

    if (token && !isUnauthenticatedAuthRequest) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
    }

    return next(req);
};
