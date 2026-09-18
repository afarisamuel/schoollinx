import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks implements OnInit {
  constructor(private seo: SeoService) {}

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-route', label: 'Implementation Roadmap' },
    heading: `From Zero to Live in <span class="ph-accent">48 Hours</span>.`,
    subtitle: `Deploying a modern school operating system doesn't have to be a multi-month project. Our dedicated engineering team and structured process get your faculty running before Monday.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(20,10,5,0.82)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
  };

  ngOnInit() {
    this.seo.updateMeta({
      title: 'How It Works — 48-Hour Rapid Onboarding',
      description: 'Discover how SchoolLinx migrates your school data and launches in under 48 hours. White-glove setup, student data import, and faculty training included.',
      url: '/how-it-works',
      image: 'assets/hero-pricing.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'How It Works', url: '/how-it-works' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'How to Deploy SchoolLinx in 48 Hours',
      'description': 'A step-by-step roadmap for institutional onboarding and launching SchoolLinx.',
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Data Extraction & Schema Mapping',
          'text': 'Provide existing student, parent, and fee spreadsheets for automated parsing.'
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Tenant Instance Provisioning',
          'text': 'Dedicated database schema created with custom grading formulas and term schedules.'
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Faculty & Staff Onboarding',
          'text': 'Interactive training session for teachers on speed grading and attendance.'
        },
        {
          '@type': 'HowToStep',
          'position': 4,
          'name': 'Go Live & Parent SMS Launch',
          'text': 'Automated welcome SMS broadcasts dispatched to parents with secure portal access links.'
        }
      ]
    });
  }
}
