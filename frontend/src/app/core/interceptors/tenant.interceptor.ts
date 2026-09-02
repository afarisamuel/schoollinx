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
        
        // Accurate subdomain detection:
        // - "myschool.schoollinx.com" (parts.length >= 3) -> "myschool"
        // - "myschool.localhost" (parts.length === 2 && parts[1] === 'localhost') -> "myschool"
        // - "schoollinx.com" (parts.length === 2) -> apex domain, no tenant subdomain
        // - "localhost" / "127.0.0.1" -> no subdomain
        const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
        if (!isIp) {
            if (parts.length >= 3) {
                const sub = parts[0].toLowerCase();
                if (sub !== 'www' && sub !== 'api' && sub !== 'admin' && sub !== 'app') {
                    subdomain = sub;
                }
            } else if (parts.length === 2 && parts[1].toLowerCase() === 'localhost') {
                const sub = parts[0].toLowerCase();
                if (sub !== 'www') {
                    subdomain = sub;
                }
            }
        }
        
        // Fall back to the subdomain cached in localStorage during login ONLY if we're on localhost or an internal route.
        if (!subdomain && (hostname === 'localhost' || hostname === '127.0.0.1')) {
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
