import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <!-- Top Glowing Indeterminate Progress Line -->
      <div class="fixed top-0 left-0 right-0 h-[3px] z-[99999] overflow-hidden pointer-events-none bg-blue-950/20">
        <div class="loading-bar-inner h-full w-full"></div>
      </div>

      <!-- Subtle Floating Sync Indicator -->
      @if (showPill()) {
        <div class="fixed bottom-5 right-5 z-[99999] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-bg-secondary/90 border border-border-primary backdrop-blur-xl shadow-2xl animate-fade-in pointer-events-none transition-all duration-300">
          <div class="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <span class="text-[11px] font-bold text-text-primary tracking-wide">Syncing data...</span>
        </div>
      }
    }
  `,
  styles: [`
    @keyframes loadingSlide {
      0% {
        transform: translateX(-100%) scaleX(0.2);
      }
      50% {
        transform: translateX(0%) scaleX(0.7);
      }
      100% {
        transform: translateX(100%) scaleX(0.2);
      }
    }

    .loading-bar-inner {
      background: #2563EB;
      box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);
      animation: loadingSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      transform-origin: left center;
    }
  `]
})
export class LoadingBarComponent {
  loadingService = inject(LoadingService);
  showPill = signal<boolean>(false);
  private pillTimeout: any = null;

  constructor() {
    effect(() => {
      const loading = this.loadingService.isLoading();
      if (loading) {
        // Debounce showing the bottom-right pill to avoid flashing on ultra-fast sub-200ms requests
        if (!this.pillTimeout) {
          this.pillTimeout = setTimeout(() => {
            if (this.loadingService.isLoading()) {
              this.showPill.set(true);
            }
          }, 200);
        }
      } else {
        if (this.pillTimeout) {
          clearTimeout(this.pillTimeout);
          this.pillTimeout = null;
        }
        this.showPill.set(false);
      }
    });
  }
}
