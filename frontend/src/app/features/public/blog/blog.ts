import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Blog & Insights | School Linx — EdTech Best Practices');
    this.meta.updateTag({ name: 'description', content: 'School administration best practices, edtech trends, and product deep-dives — curated for forward-thinking educators by the School Linx team.' });
    this.meta.updateTag({ name: 'keywords', content: 'school administration, edtech, school management, Africa education, student information system' });
  }

  heroConfig: PageHeroConfig = {
    badge: { icon: 'fa-newspaper', label: 'The Linx Ledger' },
    heading: `Insights for <span class="ph-accent">Educational Leaders</span>.`,
    subtitle: `School administration best practices, EdTech trends, product deep-dives, and financial governance frameworks — curated for forward-thinking headmasters, bursars, and ICT coordinators.`,
    image: 'assets/hero-slide-1.jpg',
    overlayColor: 'rgba(15,23,42,0.82)',
  };
}
