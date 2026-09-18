import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-case-studies',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './case-studies.html',
  styleUrl: './case-studies.css',
})
export class CaseStudies implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Success Stories & Institutional Case Studies',
      description: 'See how 500+ schools across Africa are transforming their operations with SchoolLinx. Real results: 99.4% fee recovery, 18 hours saved per teacher weekly.',
      url: '/case-studies',
      image: 'assets/hero-features.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Case Studies', url: '/case-studies' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'SchoolLinx Customer Case Studies',
      'description': 'Real-world case studies demonstrating operational transformation in African primary, secondary, and international schools.',
      'url': 'https://schoollinx.com/case-studies'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-trophy', label: 'Success Stories' },
    heading: `Real Schools. <span class="ph-accent">Real Results.</span>`,
    subtitle: `See how forward-thinking institutions across Africa are transforming their operations, improving fee recovery, and strengthening parent trust with School Linx.`,
    image: 'assets/hero-features.jpg',
    overlayColor: 'rgba(5,20,10,0.80)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
  };
}
