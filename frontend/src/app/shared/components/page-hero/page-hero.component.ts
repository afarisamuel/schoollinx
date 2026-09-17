import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface PageHeroConfig {
  badge: { icon: string; label: string };
  heading: string;
  subtitle: string;
  image: string;
  overlayColor?: string;
  ctaPrimary?: { label: string; route: string };
  ctaSecondary?: { label: string; route: string };
}

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-hero.component.html',
  styleUrl: './page-hero.component.css'
})
export class PageHeroComponent {
  @Input() config!: PageHeroConfig;

  get overlayStyle(): string {
    const c = this.config.overlayColor || 'rgba(5, 10, 30, 0.82)';
    const c55 = c.replace(/[\d.]+\)$/, '0.55)');
    const c15 = c.replace(/[\d.]+\)$/, '0.15)');
    const c75 = c.replace(/[\d.]+\)$/, '0.75)');
    return c;
  }
}
