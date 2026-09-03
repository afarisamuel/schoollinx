import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'schoollinx_admin_theme';
  
  currentTheme = signal<ThemeMode>('dark');
  isDark = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    const saved = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      this.setTheme(saved);
    } else {
      // Default to dark theme for superadmin
      this.setTheme('dark');
    }
  }

  toggleTheme() {
    const next = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: ThemeMode) {
    this.currentTheme.set(theme);
    this.isDark.set(theme === 'dark');
    localStorage.setItem(this.THEME_KEY, theme);

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }
}
