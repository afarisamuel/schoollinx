import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExitIntentPopup } from '../../components/exit-intent-popup/exit-intent-popup';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ExitIntentPopup],
    templateUrl: './public-layout.component.html',
    styleUrl: './public-layout.component.css'
})
export class PublicLayoutComponent implements OnInit {
    currentYear = new Date().getFullYear();
    isScrolled = false;
    isDark = false;

    ngOnInit() {
        // Respect user's saved preference; public site defaults to light
        const saved = localStorage.getItem('public-theme');
        this.isDark = saved === 'dark';
        this.applyTheme();
    }

    @HostListener('window:scroll', [])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 50;
    }

    toggleDarkMode() {
        this.isDark = !this.isDark;
        localStorage.setItem('public-theme', this.isDark ? 'dark' : 'light');
        this.applyTheme();
    }

    private applyTheme() {
        const html = document.documentElement;
        if (this.isDark) {
            html.classList.remove('light-mode');
        } else {
            html.classList.add('light-mode');
        }
    }
}
