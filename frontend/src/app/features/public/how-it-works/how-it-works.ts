import { Component } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-how-it-works',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {


  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-route', label: 'Implementation Roadmap' },
    heading: `From Zero to Live in <span class="ph-accent">48 Hours</span>.`,
    subtitle: `Deploying a modern school operating system doesn't have to be a multi-month project. Our dedicated engineering team and structured process get your faculty running before Monday.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(20,10,5,0.82)',
    ctaPrimary: { label: 'Start Free Trial', route: '/signup' },
  };
}
