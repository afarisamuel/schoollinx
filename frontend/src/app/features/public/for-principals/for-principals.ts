import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-principals',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-principals.html',
  styleUrl: './for-principals.css'
})
export class ForPrincipals implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Principals & Headteachers');
    this.meta.updateTag({ name: 'description', content: 'Give principals a real-time command centre. Track KPIs, manage staff, oversee academics and fees — all from one executive dashboard.' });
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
