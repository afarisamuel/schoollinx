import { Component } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-features',
    standalone: true,
    imports: [CommonModule, RouterModule, PageHeroComponent],
    templateUrl: './features.component.html',
    styleUrl: './features.component.css'
})
export class FeaturesComponent {
    modules = [
        {
            title: 'Academic Hub',
            icon: 'fa-book-reader',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            items: ['Interactive Gradebooks', 'Automated Report Cards', 'Assignment Tracking', 'Curriculum Planning']
        },
        {
            title: 'Finance & Billing',
            icon: 'fa-file-invoice-dollar',
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            items: ['Automated Fee Collection', 'Dynamic Payment Plans', 'Expense Tracking', 'Comprehensive Audits']
        },
        {
            title: 'HR & Payroll',
            icon: 'fa-user-tie',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            items: ['Staff Attendance', 'Payroll Processing', 'Leave Management', 'Performance Reviews']
        },
        {
            title: 'Communication',
            icon: 'fa-comments',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            items: ['Mass SMS & Email', 'Parent Portal', 'Teacher-Student Chat', 'Announcements']
        }
    ];

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-layer-group', label: 'Platform Capabilities' },
    heading: `Every Tool Needed to Run a <span class="ph-accent">World-Class School</span>.`,
    subtitle: `Explore our complete suite of institutional modules engineered to eliminate administrative bottlenecks, improve learning outcomes, and automate fiscal recovery.`,
    image: 'assets/hero-features.jpg',
    overlayColor: 'rgba(5,10,30,0.82)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
    ctaSecondary: { label: 'See Pricing', route: '/pricing' },
  };
}
