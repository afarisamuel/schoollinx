import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-press',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './press.html',
  styleUrl: './press.css',
})
export class Press implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Press Kit, Brand Assets & Media Resources',
      description: 'Official logos, high-res brand guidelines, executive bios, and company boilerplate. Contact the SchoolLinx communications team for press inquiries.',
      url: '/press',
      image: 'assets/hero-pricing.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Press & Media', url: '/press' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SchoolLinx Press Kit & Media Resources',
      'description': 'Brand assets, media contact, and company overview.',
      'url': 'https://schoollinx.com/press'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-id-badge', label: 'Press Kit & Media Resources' },
    heading: `Media & <span class="ph-accent">Press Resources</span>.`,
    subtitle: `Logos, brand guidelines, company boilerplate, key statistics, and media contacts for journalists, analysts, and content creators covering School Linx.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(5,10,30,0.84)',
  };
}
