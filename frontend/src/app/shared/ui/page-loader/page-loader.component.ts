import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center p-8 md:p-16 text-center animate-fade-in" [ngClass]="{ 'min-h-[50vh]': fullHeight }">
      <!-- Glowing Animated Rings -->
      <div class="relative flex items-center justify-center w-14 h-14 mb-4">
        <div class="absolute inset-0 rounded-full border-2 border-teal-500/20 animate-ping opacity-40"></div>
        <div class="w-12 h-12 rounded-full border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
        <div class="absolute w-2.5 h-2.5 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50"></div>
      </div>
      
      <!-- Label -->
      <h4 class="text-sm font-black text-text-primary tracking-wide mb-1">{{ text }}</h4>
      @if (subtext) {
        <p class="text-xs text-text-muted max-w-sm">{{ subtext }}</p>
      }
    </div>
  `
})
export class PageLoaderComponent {
  @Input() text: string = 'Loading data...';
  @Input() subtext?: string = 'Connecting to school database and synchronizing latest records.';
  @Input() fullHeight: boolean = false;
}
