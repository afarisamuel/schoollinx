import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface PageSeoConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: string;
  locale?: string;
  author?: string;
  keywords?: string;
  twitterSite?: string;
  noindex?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ArticleSeoConfig {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly baseUrl = 'https://schoollinx.com';
  private readonly defaultImage = 'https://schoollinx.com/og-image.png';
  private readonly defaultSiteName = 'SchoolLinx';
  private readonly defaultTwitterSite = '@schoollinx';

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  /**
   * Set page SEO meta tags supporting both overloaded signature or full config object.
   */
  updateMeta(configOrTitle: PageSeoConfig | string, description?: string, url?: string) {
    let config: PageSeoConfig;

    if (typeof configOrTitle === 'string') {
      config = {
        title: configOrTitle,
        description: description || '',
        url: url || ''
      };
    } else {
      config = configOrTitle;
    }

    const fullTitle = config.title.includes('School Linx') || config.title.includes('SchoolLinx')
      ? config.title
      : `${config.title} | SchoolLinx`;

    this.title.setTitle(fullTitle);

    // Standard Meta Tags
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }
    this.meta.updateTag({ name: 'author', content: config.author || 'SchoolLinx' });

    // Robots
    if (config.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      });
    }

    // Canonical URL
    const pageUrl = config.url
      ? (config.url.startsWith('http') ? config.url : `${this.baseUrl}${config.url}`)
      : this.baseUrl;
    this.setCanonicalUrl(pageUrl);

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ property: 'og:type', content: config.type || 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.defaultSiteName });
    this.meta.updateTag({ property: 'og:locale', content: config.locale || 'en_US' });

    const imageUrl = config.image
      ? (config.image.startsWith('http') ? config.image : `${this.baseUrl}/${config.image.replace(/^\//, '')}`)
      : this.defaultImage;

    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:alt', content: config.imageAlt || fullTitle });
    this.meta.updateTag({ property: 'og:image:width', content: (config.imageWidth || 1200).toString() });
    this.meta.updateTag({ property: 'og:image:height', content: (config.imageHeight || 630).toString() });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:site', content: config.twitterSite || this.defaultTwitterSite });
    this.meta.updateTag({ name: 'twitter:creator', content: config.twitterSite || this.defaultTwitterSite });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image:alt', content: config.imageAlt || fullTitle });
  }

  private setCanonicalUrl(url: string) {
    if (!this.document) return;
    let link = this.document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Dynamically manage JSON-LD structured data script
   */
  setJsonLd(schema: object | object[], scriptId: string = 'seo-jsonld-schema') {
    if (!this.document) return;

    let script = this.document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema, null, 2);
  }

  /**
   * Set BreadcrumbList schema
   */
  setBreadcrumbs(items: BreadcrumbItem[]) {
    const itemListElement = items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${this.baseUrl}${item.url}`
    }));

    const breadcrumbsSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement
    };

    this.setJsonLd(breadcrumbsSchema, 'seo-jsonld-breadcrumbs');
  }

  /**
   * Set FAQPage structured data
   */
  setFaqJsonLd(faqs: FaqItem[]) {
    if (!faqs || faqs.length === 0) return;

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    this.setJsonLd(faqSchema, 'seo-jsonld-faq');
  }

  /**
   * Set Article / BlogPosting schema
   */
  setArticleJsonLd(article: ArticleSeoConfig) {
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      image: article.image ? (article.image.startsWith('http') ? article.image : `${this.baseUrl}/${article.image.replace(/^\//, '')}`) : this.defaultImage,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: {
        '@type': 'Organization',
        name: article.author || 'SchoolLinx',
        url: this.baseUrl
      },
      publisher: {
        '@type': 'Organization',
        name: 'SchoolLinx',
        logo: {
          '@type': 'ImageObject',
          url: `${this.baseUrl}/assets/images/app-icon.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': article.url.startsWith('http') ? article.url : `${this.baseUrl}${article.url}`
      }
    };

    this.setJsonLd(articleSchema, 'seo-jsonld-article');
  }
}
