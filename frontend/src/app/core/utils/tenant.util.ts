/**
 * Extracts the tenant subdomain from the current browser hostname.
 * 
 * Rules:
 * - "schoollinx.com" (apex domain) -> "" (Public Site)
 * - "www.schoollinx.com" -> "" (Public Site)
 * - "kendemy.schoollinx.com" -> "kendemy" (Tenant Domain)
 * - "kendemy.localhost" -> "kendemy" (Local Dev Tenant)
 * - "localhost" / "127.0.0.1" -> fallback to localStorage for local testing
 */
export function getTenantSubdomain(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    const hostname = window.location.hostname;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIp) {
        return '';
    }

    const parts = hostname.split('.');

    if (parts.length >= 3) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'api', 'admin', 'app', 'mail'].includes(sub)) {
            return sub;
        }
    } else if (parts.length === 2 && parts[1].toLowerCase() === 'localhost') {
        const sub = parts[0].toLowerCase();
        if (sub !== 'www') {
            return sub;
        }
    }

    // For plain localhost dev only, fallback to localStorage if explicitly set
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return localStorage.getItem('tenant_subdomain') || '';
    }

    return '';
}

export function isTenantDomain(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    // If accessing known public pages directly, do not lock to tenant routes
    const publicPaths = [
        '/contact', '/pricing', '/features', '/about', '/blog', '/press', 
        '/updates', '/signup', '/how-it-works', '/case-studies', 
        '/for-principals', '/for-teachers', '/for-parents', '/legal',
        '/privacy', '/terms', '/security', '/cookie-policy'
    ];
    const isPublicPath = publicPaths.some(p => window.location.pathname.startsWith(p));
    if (isPublicPath) {
        return false;
    }

    const subdomain = getTenantSubdomain();
    return !!subdomain;
}
