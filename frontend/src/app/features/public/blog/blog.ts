import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'Blog & Insights — EdTech Best Practices for School Leaders',
      description: 'School administration best practices, EdTech trends, biometric roll-call guides, and financial governance frameworks for African educational leaders.',
      keywords: 'school administration, edtech Africa, school management, student information system, speed gradebook',
      url: '/blog',
      image: 'assets/hero-slide-1.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': 'The Linx Ledger — SchoolLinx Blog',
      'description': 'Insights, product deep-dives, and administrative best practices curated for educators.',
      'url': 'https://schoollinx.com/blog',
      'publisher': {
        '@type': 'Organization',
        'name': 'SchoolLinx',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://schoollinx.com/assets/images/app-icon.png'
        }
      }
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-newspaper', label: 'The Linx Ledger' },
    heading: `Insights for <span class="ph-accent">Educational Leaders</span>.`,
    subtitle: `School administration best practices, EdTech trends, product deep-dives, and financial governance frameworks — curated for forward-thinking headmasters, bursars, and ICT coordinators.`,
    image: 'assets/hero-slide-1.jpg',
    overlayColor: 'rgba(15,23,42,0.82)',
  };
}
