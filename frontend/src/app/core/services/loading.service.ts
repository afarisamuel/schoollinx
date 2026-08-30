import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private router = inject(Router);

  private isNavigating = signal<boolean>(false);
  private activeRequests = signal<number>(0);
  private manualLoading = signal<boolean>(false);

  /**
   * Consolidated loading signal: true whenever navigation is occurring,
   * any HTTP request is in-flight, or manual loading is flagged.
   */
  readonly isLoading = computed(() =>
    this.isNavigating() || this.activeRequests() > 0 || this.manualLoading()
  );

  /**
   * Count of active HTTP requests currently running
   */
  readonly activeCount = computed(() => this.activeRequests());

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating.set(false);
      }
    });
  }

  startRequest() {
    this.activeRequests.update(count => count + 1);
  }

  endRequest() {
    this.activeRequests.update(count => Math.max(0, count - 1));
  }

  show() {
    this.manualLoading.set(true);
  }

  hide() {
    this.manualLoading.set(false);
  }
}
