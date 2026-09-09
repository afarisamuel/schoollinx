import { Component } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pricing',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, PageHeroComponent],
    templateUrl: './pricing.component.html',
    styleUrl: './pricing.component.css'
})
export class PricingComponent {
    studentCount: number = 500;
    hourlyRate: number = 25;

    get hoursSavedPerMonth(): number {
        // Assume saving 2 hours per student per year, so per month:
        return Math.round((this.studentCount * 2) / 12);
    }

    get moneySavedPerMonth(): number {
        return this.hoursSavedPerMonth * this.hourlyRate;
    }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-tags', label: 'Transparent Institutional Pricing' },
    heading: `Predictable, Fair Pricing for <span class="ph-accent">Every School</span>.`,
    subtitle: `No hidden fees or licensing traps. Pay a transparent flat fee per active student per term with all core academic, administrative, and communication modules included.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(5,25,15,0.82)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
    ctaSecondary: { label: 'Talk to Sales', route: '/contact' },
  };
}
