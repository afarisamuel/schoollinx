import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-updates',
  imports: [PageHeroComponent],
  templateUrl: './updates.html',
  styleUrl: './updates.css',
})
export class Updates implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Product Changelog | School Linx — What\'s New');
    this.meta.updateTag({ name: 'description', content: 'Follow every new feature, improvement, and fix shipped by the School Linx team. We build in public — see exactly what\'s new each week.' });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-code-merge', label: 'Product Changelog' },
    heading: `What's New in <span class="ph-accent">School Linx</span>.`,
    subtitle: `We ship meaningful improvements every week. Follow along to see exactly how the platform is evolving to serve you better.`,
    image: 'assets/hero-slide-2.jpg',
    overlayColor: 'rgba(15,5,30,0.82)',
  };
}
