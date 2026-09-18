import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo';

@Component({
  selector: 'app-for-teachers',
  standalone: true,
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-teachers.html',
  styleUrl: './for-teachers.css'
})
export class ForTeachers implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta({
      title: 'SchoolLinx for Teachers — Fast Gradebooks & Roll-Call',
      description: 'Dynamic speed gradebook, 1-click attendance, and automated remark generator. SchoolLinx saves teachers 18+ hours per week on administrative paperwork.',
      url: '/for-teachers',
      image: 'assets/hero-slide-1.jpg'
    });

    this.seo.setBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'For Teachers', url: '/for-teachers' }
    ]);

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SchoolLinx for Teachers & Faculty',
      'description': 'Speed gradebooks and automated classroom tools for school teachers.',
      'url': 'https://schoollinx.com/for-teachers'
    });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-chalkboard-teacher', label: 'Built for Faculty & Educators' },
    heading: `Less Administrative Busywork. <span class="ph-accent">More Teaching</span>.`,
    subtitle: `School Linx automates continuous assessment math, roll-call attendance, and report card remark generation so you can focus on classroom excellence.`,
    image: 'assets/hero-slide-1.jpg',
    overlayColor: 'rgba(5,20,10,0.82)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
  };
}
