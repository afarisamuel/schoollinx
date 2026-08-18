import { Directive, ElementRef, OnInit, Renderer2, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]'
})
export class ScrollReveal implements OnInit {
  private observer: IntersectionObserver | null = null;

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.renderer.addClass(this.el.nativeElement, 'reveal-hidden');
    
    if (isPlatformBrowser(this.platformId) && typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.renderer.addClass(this.el.nativeElement, 'reveal-visible');
            this.renderer.removeClass(this.el.nativeElement, 'reveal-hidden');
            this.observer?.unobserve(this.el.nativeElement);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      this.observer.observe(this.el.nativeElement);
    } else {
      // For SSR or unsupported browsers, immediately show the content
      this.renderer.addClass(this.el.nativeElement, 'reveal-visible');
      this.renderer.removeClass(this.el.nativeElement, 'reveal-hidden');
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
