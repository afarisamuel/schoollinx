import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

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
        // Attempt to extract the subdomain from the current window location
        const hostname = window.location.hostname;
        let subdomain = '';
        const parts = hostname.split('.');
        
        // Simple heuristic to extract subdomain if it exists (e.g. org1.example.com -> org1, org1.localhost -> org1)
        if (parts.length >= 2) {
            subdomain = parts[0];
            if (subdomain === 'www' || subdomain === 'localhost' || subdomain === '127') {
                subdomain = '';
            }
        }
        
        // Fall back to the subdomain cached in localStorage during login.
        // This is the primary mechanism for localhost development where there is no real subdomain.
        if (!subdomain) {
            subdomain = localStorage.getItem('tenant_subdomain') || '';
        }

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
