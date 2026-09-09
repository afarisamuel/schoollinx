import { Component, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-teachers',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './for-teachers.html',
  styleUrl: './for-teachers.css'
})
export class ForTeachers implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Teachers — Less Admin, More Teaching');
    this.meta.updateTag({ name: 'description', content: 'Digital grade book, one-click attendance, and automated report cards. School Linx helps teachers spend less time on paperwork and more time on teaching.' });
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
