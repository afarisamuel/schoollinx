import { Injectable, ApplicationRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { filter, concatMap } from 'rxjs/operators';
import { first } from 'rxjs';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Injectable({
    providedIn: 'root'
})
export class PwaUpdateService {
    private appRef = inject(ApplicationRef);
    private dialog = inject(DialogService);

    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    constructor() {
        if (this.isBrowser) {
            this.initUpdateChecks();
        }
    }

    private initUpdateChecks() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        // Wait for the app to stabilize before checking for updates
        const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));

        appIsStable$.subscribe(() => {
            this.checkForUpdate();
            // Re-check every 6 hours
            setInterval(() => this.checkForUpdate(), 6 * 60 * 60 * 1000);
        });

        // Listen for the service worker's update found message
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
                this.promptUserToUpdate();
            }
        });

        // Also listen for controllerchange which fires when a new SW takes over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Avoid reloading immediately on first install
            if (this.hasActivatedBefore()) {
                window.location.reload();
            }
            this.markActivated();
        });
    }

    private async checkForUpdate(): Promise<void> {
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            if (reg) {
                await reg.update();
            }
        } catch {
            // SW update check is non-critical
        }
    }

    private promptUserToUpdate() {
        this.dialog.confirm(
            'A new version of the Institutional Management System is available. Update now? (Recommended to prevent stale data sync)',
            'Update Available',
            'info',
            'Update Now'
        ).subscribe((shouldUpdate: boolean) => {
            if (shouldUpdate) {
                window.location.reload();
            }
        });
    }

    private hasActivatedBefore(): boolean {
        try {
            return !!sessionStorage.getItem('sw_activated');
        } catch {
            return false;
        }
    }

    private markActivated(): void {
        try {
            sessionStorage.setItem('sw_activated', '1');
        } catch {}
    }
}
