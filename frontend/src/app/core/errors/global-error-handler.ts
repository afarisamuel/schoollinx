import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private zone = inject(NgZone);

  handleError(error: any): void {
    const message = error?.message || error?.toString() || '';

    // Detect dynamic chunk load failures (when new release changes JS bundle hashes)
    const isChunkFailure =
      /Loading chunk [\d\w-]+ failed/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message) ||
      /Importing a module script failed/i.test(message) ||
      /error loading dynamically imported module/i.test(message);

    if (isChunkFailure && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('last_chunk_load_reload');
      const now = Date.now();

      // Avoid infinite reload loops by throttling reloads (at least 15s between attempts)
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('last_chunk_load_reload', now.toString());
        console.warn('[GlobalErrorHandler] Stale chunk detected after deployment. Auto-refreshing to load latest assets...');
        this.zone.runOutsideAngular(() => {
          window.location.reload();
        });
        return;
      }
    }

    console.error('[GlobalErrorHandler] Unhandled error:', error);
  }
}
