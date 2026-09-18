import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-for-parents',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-parents.html',
  styleUrl: './for-parents.css'
})
export class ForParents implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'SchoolLinx for Parents & Guardians — Real-Time Academic Tracking',
      description: 'Stay connected to your child\'s education with instant SMS attendance alerts, live grade tracking, terminal PDF report cards, and secure online fee payments.',
      url: '/for-parents',
      image: 'assets/hero-slide-3.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'For Parents', url: '/for-parents' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SchoolLinx for Parents & Families',
      'description': 'Real-time parent portal and instant SMS communication platform.',
      'url': 'https://schoollinx.com/for-parents'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-users', label: 'Built for Parents & Guardians' },
    heading: `Stay Connected to Your Child's <span class="ph-accent">Academic Journey</span>.`,
    subtitle: `Never miss a grade update, an unexcused absence, or a tuition deadline again. Access real-time attendance, digital report cards, and secure online fee settlement from any phone.`,
    image: 'assets/hero-slide-3.jpg',
    overlayColor: 'rgba(30,10,40,0.80)',
    ctaPrimary: { label: 'Get Started', route: '/signup' },
  };
}
