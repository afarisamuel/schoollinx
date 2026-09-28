import { environment } from '../../../environments/environment';

/**
 * Formats a document/photo URL so it can be reliably loaded by browser <img> tags
 * across different frontend and backend domains/subdomains.
 */
export function formatMediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    
    // Return Data URLs or Blobs directly (used for instant preview / camera capture)
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    // Extract tenant subdomain if present
    let subdomain = '';
    if (typeof window !== 'undefined') {
        subdomain = localStorage.getItem('tenant_subdomain') || '';
        if (!subdomain && window.location?.hostname) {
            const parts = window.location.hostname.split('.');
            if (parts.length >= 3) {
                const sub = parts[0].toLowerCase();
                if (!['www', 'api', 'admin', 'app'].includes(sub)) {
                    subdomain = sub;
                }
            } else if (parts.length === 2 && parts[1].toLowerCase() === 'localhost') {
                const sub = parts[0].toLowerCase();
                if (sub !== 'www') {
                    subdomain = sub;
                }
            }
        }
    }

    let finalUrl = url;

    // If it's a relative path starting with /api or /
    if (url.startsWith('/api')) {
        const base = environment.apiUrl.replace(/\/api\/?$/, '');
        finalUrl = `${base}${url}`;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const base = environment.apiUrl.replace(/\/api\/?$/, '');
        finalUrl = `${base}/${url.replace(/^\//, '')}`;
    }

    // Append tenant query parameter if not already present
    if (subdomain && !finalUrl.includes('tenant=')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}tenant=${encodeURIComponent(subdomain)}`;
    }

    return finalUrl;
}
