import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-updates',
  standalone: true,
  imports: [PageHeroComponent],
  templateUrl: './updates.html',
  styleUrl: './updates.css',
})
export class Updates implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Product Changelog & Release Notes',
      description: 'Follow every new feature, improvement, and speed enhancement shipped by the SchoolLinx engineering team. We build in public with weekly updates.',
      url: '/updates',
      image: 'assets/hero-slide-2.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Product Updates', url: '/updates' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'SchoolLinx Product Release Notes & Changelog',
      'description': 'Chronological updates and improvements to SchoolLinx.',
      'url': 'https://schoollinx.com/updates'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-code-merge', label: 'Product Changelog' },
    heading: `What's New in <span class="ph-accent">School Linx</span>.`,
    subtitle: `We ship meaningful improvements every week. Follow along to see exactly how the platform is evolving to serve you better.`,
    image: 'assets/hero-slide-2.jpg',
    overlayColor: 'rgba(15,5,30,0.82)',
  };
}
