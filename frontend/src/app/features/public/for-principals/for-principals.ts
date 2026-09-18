import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-for-principals',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-principals.html',
  styleUrl: './for-principals.css'
})
export class ForPrincipals implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'SchoolLinx for Principals & School Owners — Executive Control',
      description: 'Give school leaders an executive command center. Real-time institutional KPIs, staff accountability, automated grading oversight, and fee recovery ledgers.',
      url: '/for-principals',
      image: 'assets/hero-slide-2.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'For Principals', url: '/for-principals' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SchoolLinx for Principals & Headteachers',
      'description': 'Executive management tools designed for school principals and institutional directors.',
      'url': 'https://schoollinx.com/for-principals'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-user-tie', label: 'Built for School Owners & Principals' },
    heading: `Run Your School with Complete <span class="ph-accent">Executive Clarity</span>.`,
    subtitle: `School Linx provides principals and headteachers with a real-time executive dashboard — from academic trajectory and staff accountability to automated tuition fee recovery.`,
    image: 'assets/hero-slide-2.jpg',
    overlayColor: 'rgba(5,10,30,0.85)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
  };
}
