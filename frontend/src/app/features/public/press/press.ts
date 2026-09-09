import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-press',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './press.html',
  styleUrl: './press.css',
})
export class Press implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Press Kit & Media Resources | School Linx');
    this.meta.updateTag({ name: 'description', content: 'Download School Linx logos, brand guidelines, and company boilerplate. Contact our press team for media inquiries and analyst briefings.' });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-id-badge', label: 'Press Kit & Media Resources' },
    heading: `Media & <span class="ph-accent">Press Resources</span>.`,
    subtitle: `Logos, brand guidelines, company boilerplate, key statistics, and media contacts for journalists, analysts, and content creators covering School Linx.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(5,10,30,0.84)',
  };
}
