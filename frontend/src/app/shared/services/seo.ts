import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private title: Title, 
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  updateMeta(title: string, description: string, url: string = '') {
    this.title.setTitle(`${title} | School Linx`);
    
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `${title} | School Linx` });
    this.meta.updateTag({ property: 'og:description', content: description });
    
    if (url) {
      this.meta.updateTag({ property: 'og:url', content: `https://schoollinx.com${url}` });
      // Add canonical link safely using the DOCUMENT injection token
      let canonical = this.document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!canonical) {
        canonical = this.document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        this.document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', `https://schoollinx.com${url}`);
    }
  }
}
