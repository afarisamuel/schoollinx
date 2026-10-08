import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { getTenantSubdomain } from '../utils/tenant.util';

export const tenantInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);
    
    // In a multi-tenant application using subdomains, the browser natively sends the subdomain in the Host header automatically.
    // However, during local development or in specific edge cases where the API doesn't share the subdomain, 
    // we can explicitly attach the tenant context to ensure the backend identifies the correct tenant.
    
    let clonedReq = req;

    // Rewrite relative API URLs to absolute API URLs
    if (req.url.startsWith('/api')) {
        clonedReq = req.clone({
            url: `${environment.apiUrl}${req.url.substring(4)}`
        });
        req = clonedReq; // Important: Update req so subsequent clones use the new URL
    }

    if (isBrowser) {
        const subdomain = getTenantSubdomain();

        // Always attach X-Tenant-Subdomain if we found one
        if (subdomain) {
            clonedReq = req.clone({
                headers: req.headers.set('X-Tenant-Subdomain', subdomain)
            });
            req = clonedReq;
        }

        // Optionally check local storage for an explicit override (often used for testing or specific auth flows)
        const storedTenantId = localStorage.getItem('X-Tenant-ID');

        // If an explicit override exists, inject it as a fallback header
        if (storedTenantId) {
            clonedReq = req.clone({
                headers: req.headers.set('X-Tenant-ID', storedTenantId)
            });
        }
    }

    return next(clonedReq);
};
