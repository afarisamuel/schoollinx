import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside 
      class="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none p-2"
      role="region"
      aria-label="Notifications"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          role="status"
          aria-live="polite"
          class="pointer-events-auto relative overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3.5 p-4"
          [ngClass]="{
            'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10': toast.type === 'success',
            'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-500/10': toast.type === 'error',
            'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10': toast.type === 'warning',
            'bg-slate-900/95 border-indigo-500/40 text-slate-100 shadow-indigo-500/10': toast.type === 'info'
          }"
        >
          <!-- Icon indicator -->
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            } @else if (toast.type === 'error') {
              <div class="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
            } @else if (toast.type === 'warning') {
              <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
            } @else {
              <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pr-1">
            <h4 class="text-xs font-black tracking-wide" [ngClass]="{
              'text-emerald-400': toast.type === 'success',
              'text-rose-400': toast.type === 'error',
              'text-amber-400': toast.type === 'warning',
              'text-indigo-400': toast.type === 'info'
            }">{{ toast.title }}</h4>
            <p class="text-xs text-slate-200 mt-0.5 leading-relaxed break-words font-medium">{{ toast.message }}</p>
          </div>

          <!-- Dismiss button -->
          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <!-- Bottom accent border -->
          <div class="absolute bottom-0 left-0 right-0 h-[2px]" [ngClass]="{
            'bg-emerald-500': toast.type === 'success',
            'bg-rose-500': toast.type === 'error',
            'bg-amber-500': toast.type === 'warning',
            'bg-indigo-500': toast.type === 'info'
          }"></div>
        </div>
      }
    </aside>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
