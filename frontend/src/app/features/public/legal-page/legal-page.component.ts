import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Meta, Title, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { environment } from '../../../../environments/environment';

export interface PublicLegalPage {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content?: string;
  version: string;
  effective_date?: string;
  updated_at: string;
}

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeroComponent, DatePipe],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.css'
})
export class LegalPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private sanitizer = inject(DomSanitizer);

  private sub = new Subscription();

  currentSlug = signal<string>('privacy-policy');
  page = signal<PublicLegalPage | null>(null);
  allPolicies = signal<PublicLegalPage[]>([]);
  isLoading = signal<boolean>(true);
  copied = signal<boolean>(false);

  renderedContent = computed<SafeHtml>(() => {
    const p = this.page();
    if (!p || !p.content) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(p.content));
  });

  heroConfig = signal<PageHeroConfig>({
    badge: { icon: 'fa-shield-halved', label: 'Institutional Trust & Governance' },
    heading: `Legal & <span class="ph-accent">Compliance Registry</span>.`,
    subtitle: `Explore SchoolLinx dynamic data protection policies, institutional terms of service, and cryptographic isolation standards.`,
    image: 'assets/hero-pricing.jpg',
    overlayColor: 'rgba(5, 12, 36, 0.88)'
  });

  ngOnInit() {
    this.loadPolicyList();

    this.sub.add(
      this.route.paramMap.subscribe(params => {
        const slug = params.get('slug') || 'privacy-policy';
        this.currentSlug.set(slug);
        this.loadPolicy(slug);
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadPolicyList() {
    this.http.get<PublicLegalPage[]>(`${environment.apiUrl}/public/legal-pages`).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.allPolicies.set(list);
        } else {
          this.allPolicies.set(this.getFallbackPolicyList());
        }
      },
      error: () => {
        this.allPolicies.set(this.getFallbackPolicyList());
      }
    });
  }

  loadPolicy(slug: string) {
    this.isLoading.set(true);
    this.http.get<PublicLegalPage>(`${environment.apiUrl}/public/legal-pages/${slug}`).subscribe({
      next: (data) => {
        this.page.set(data);
        this.updateSeo(data);
        this.isLoading.set(false);
      },
      error: () => {
        // Use fallback static policy if backend is unavailable or not seeded
        const fallback = this.getFallbackPolicy(slug);
        this.page.set(fallback);
        this.updateSeo(fallback);
        this.isLoading.set(false);
      }
    });
  }

  private updateSeo(page: PublicLegalPage) {
    const pageTitle = `${page.title} | Legal & Trust | School Linx`;
    this.titleService.setTitle(pageTitle);

    const desc = page.summary || `Official ${page.title} for the School Linx educational management platform.`;
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: desc });

    this.heroConfig.set({
      badge: { icon: 'fa-shield-halved', label: page.category || 'Legal & Compliance' },
      heading: `${page.title.split('&')[0]} <span class="ph-accent">${page.title.includes('&') ? '& ' + page.title.split('&')[1] : ''}</span>`,
      subtitle: page.summary || `Official operational policy and binding legal agreement for SchoolLinx institutions.`,
      image: 'assets/hero-pricing.jpg',
      overlayColor: 'rgba(5, 12, 36, 0.88)'
    });
  }

  printPolicy() {
    window.print();
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  private parseMarkdown(md: string): string {
    if (!md) return '';
    return md
      // Script sanitization
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="legal-h3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="legal-h2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="legal-h1">$1</h1>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Dividers
      .replace(/^---$/gim, '<hr class="legal-divider" />')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="legal-code">$1</code>')
      // Unordered lists
      .replace(/^\s*-\s+(.*$)/gim, '<li class="legal-li">$1</li>')
      // Wrap sequential lists
      .replace(/(<li class="legal-li">.*<\/li>)/gims, '<ul class="legal-ul">$1</ul>')
      // Paragraphs
      .replace(/\n\n+/g, '</p><p class="legal-p">');
  }

  private getFallbackPolicyList(): PublicLegalPage[] {
    return [
      {
        id: '1',
        slug: 'privacy-policy',
        title: 'Privacy Policy & Data Protection',
        category: 'Privacy & Compliance',
        summary: 'How SchoolLinx protects and isolates student and guardian data.',
        version: 'v2.4',
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        slug: 'terms-of-service',
        title: 'Institutional Terms of Service',
        category: 'Terms & Conditions',
        summary: 'Operational SLAs, uptime guarantees, and institutional agreements.',
        version: 'v2.1',
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        slug: 'cookie-policy',
        title: 'Cookie & Tracking Policy',
        category: 'Privacy & Compliance',
        summary: 'Session tokens and preference cookies disclosure.',
        version: 'v1.5',
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        slug: 'security-whitepaper',
        title: 'Security & Compliance Whitepaper',
        category: 'Security & Compliance',
        summary: 'Zero-trust architecture, schema isolation, and disaster recovery.',
        version: 'v3.0',
        updated_at: new Date().toISOString()
      }
    ];
  }

  private getFallbackPolicy(slug: string): PublicLegalPage {
    const list = this.getFallbackPolicyList();
    const found = list.find(p => p.slug === slug || slug.includes(p.slug.split('-')[0]));
    const now = new Date().toISOString();

    if (found) {
      return {
        ...found,
        effective_date: now,
        content: `## 1. Executive Summary\n\nSchoolLinx operates with strict cryptographic schema isolation for all educational institutions.\n\n---\n\n## 2. Institutional Commitment\n\nAll student records, fee ledgers, and attendance data are isolated within dedicated database schemas and protected by AES-256 cloud encryption.\n\n---\n\n## 3. Compliance\n\nCompliant with GDPR, Data Protection Act (DPA), and GES/WAEC standards.`
      };
    }

    return {
      id: 'fallback',
      slug: slug,
      title: 'Institutional Policy',
      category: 'Governance',
      summary: 'Official SchoolLinx compliance policy document.',
      version: 'v1.0',
      effective_date: now,
      updated_at: now,
      content: `## Policy Details\n\nThis policy is maintained by the SchoolLinx governance team.`
    };
  }
}
