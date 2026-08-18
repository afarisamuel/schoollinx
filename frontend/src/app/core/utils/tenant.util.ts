export function isTenantDomain(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    let subdomain = '';
    if (parts.length >= 2) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'localhost' && sub !== '127') {
            subdomain = sub;
        }
    }
    
    if (!subdomain) {
        // Do not force tenant routes if accessing a known public page directly on the base domain
        const publicPaths = ['/contact', '/pricing', '/features', '/about', '/blog', '/press', '/updates', '/signup', '/how-it-works', '/case-studies', '/for-principals', '/for-teachers', '/for-parents'];
        const isPublicPath = publicPaths.some(p => window.location.pathname.startsWith(p));
        
        if (!isPublicPath) {
            subdomain = localStorage.getItem('tenant_subdomain') || '';
        }
    }

    return !!subdomain;
}
