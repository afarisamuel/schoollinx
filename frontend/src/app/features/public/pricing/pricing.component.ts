import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../../shared/services/seo';

@Component({
    selector: 'app-pricing',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, PageHeroComponent],
    templateUrl: './pricing.component.html',
    styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
    studentCount: number = 500;
    hourlyRate: number = 25;

    constructor(private seo: SeoService) {}

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

    ngOnInit() {
        this.seo.updateMeta({
            title: 'Transparent Institutional Pricing & Calculator',
            description: 'Simple, predictable per-student pricing for schools of all sizes. All features included with zero setup fees, free onboarding, and dedicated technical support.',
            url: '/pricing',
            image: 'assets/hero-pricing.jpg'
        });

        this.seo.setBreadcrumbs([
            { name: 'Home', url: '/' },
            { name: 'Pricing', url: '/pricing' }
        ]);

        this.seo.setJsonLd({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'SchoolLinx',
            'applicationCategory': 'EducationalApplication',
            'offers': {
                '@type': 'AggregateOffer',
                'priceCurrency': 'USD',
                'lowPrice': '2.00',
                'highPrice': '5.00',
                'offerCount': '3',
                'priceValidUntil': '2027-12-31'
            }
        });
    }
}
