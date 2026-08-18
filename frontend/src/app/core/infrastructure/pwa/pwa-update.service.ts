import { Injectable, ApplicationRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, concatMap } from 'rxjs/operators';
import { first } from 'rxjs';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Injectable({
    providedIn: 'root'
})
export class PwaUpdateService {
    private updates = inject(SwUpdate);
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
        if (!this.updates.isEnabled) {
            return;
        }

        // Allow the app to stabilize first before polling for updates
        // This prevents polling during initial heavy bootstrapping/rendering.
        const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));

        // After stable, check for an update immediately, then set an interval (e.g., every 6 hours)
        appIsStable$.subscribe(() => {
            this.updates.checkForUpdate();
            setInterval(() => {
                this.updates.checkForUpdate();
            }, 6 * 60 * 60 * 1000);
        });

        // Listen for events indicating a new version was successfully downloaded
        this.updates.versionUpdates
            .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
            .subscribe(evt => {
                console.log(`New version ready: ${evt.currentVersion} -> ${evt.latestVersion}`);
                this.promptUserToUpdate();
            });
    }

    private promptUserToUpdate() {
        this.dialog.confirm(
            'A new version of the Institutional Management System is available. Update now? (Recommended to prevent stale data sync)',
            'Update Available',
            'info',
            'Update Now'
        ).subscribe((shouldUpdate: boolean) => {
            if (shouldUpdate) {
                this.updates.activateUpdate().then(() => {
                    document.location.reload();
                });
            }
        });
    }
}
