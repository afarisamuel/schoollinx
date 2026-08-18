import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'dark' | 'light';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    theme = signal<Theme>('dark');

    constructor() {
        if (this.isBrowser) {
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                this.theme.set(savedTheme);
                this.applyTheme(savedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                this.theme.set('light');
                this.applyTheme('light');
            }
        }
    }

    toggleTheme() {
        const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
        this.theme.set(nextTheme);
        if (this.isBrowser) {
            localStorage.setItem('theme', nextTheme);
            this.applyTheme(nextTheme);
        }
    }

    private applyTheme(currentTheme: Theme) {
        if (!this.isBrowser) return;

        if (currentTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
    }
}
