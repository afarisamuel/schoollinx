import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-parents',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-parents.html',
  styleUrl: './for-parents.css'
})
export class ForParents implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Parents — Stay Close to Your Child\'s Education');
    this.meta.updateTag({ name: 'description', content: 'Real-time grades, attendance alerts, and online fee payments. School Linx keeps parents fully informed about their child\'s school life.' });
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
