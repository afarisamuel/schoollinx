import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExitIntentPopup } from '../../components/exit-intent-popup/exit-intent-popup';
import { TenantProfileService } from '../../../core/infrastructure/tenant-profile.service';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, ExitIntentPopup],
    templateUrl: './public-layout.component.html',
    styleUrl: './public-layout.component.css'
})
export class PublicLayoutComponent implements OnInit {
    private tenantProfileService = inject(TenantProfileService);
    tenantProfile = signal<{ name: string; subdomain: string; logo_url: string } | null>(null);
    
    currentYear = new Date().getFullYear();
    isScrolled = false;
    isDark = false;
    isMobileMenuOpen = false;

    ngOnInit() {
        // Respect user's saved preference; public site defaults to light
        const saved = localStorage.getItem('public-theme');
        this.isDark = saved === 'dark';
        this.applyTheme();
        
        this.tenantProfileService.getPublicInfo().subscribe({
            next: (info) => this.tenantProfile.set(info),
            error: () => {}
        });
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

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    private applyTheme() {
        const html = document.documentElement;
        if (this.isDark) {
            html.classList.add('dark');
            html.classList.remove('light-mode');
        } else {
            html.classList.remove('dark');
            html.classList.add('light-mode');
        }
    }
}
