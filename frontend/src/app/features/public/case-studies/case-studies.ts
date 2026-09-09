import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-case-studies',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './case-studies.html',
  styleUrl: './case-studies.css',
})
export class CaseStudies implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Success Stories & Case Studies | School Linx');
    this.meta.updateTag({ name: 'description', content: 'See how 500+ schools across Africa are transforming their operations with School Linx. Real results, real metrics, real schools.' });
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
