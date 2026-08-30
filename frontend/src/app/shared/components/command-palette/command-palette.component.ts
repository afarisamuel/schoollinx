import { Component, HostListener, signal, inject, ElementRef, ViewChild, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SearchService, SearchResult } from '../../../core/infrastructure/search/search.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

export interface CategoryFilter {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css',
})
export class CommandPaletteComponent {
  searchService = inject(SearchService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  results = signal<SearchResult[]>([]);
  selectedIndex = signal<number>(0);
  query = signal<string>('');
  activeCategory = signal<string>('all');

  categories: CategoryFilter[] = [
    { id: 'all', label: 'All Modules', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'action', label: 'Quick Actions', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'academic', label: 'Academics', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
    { id: 'registry', label: 'Registry & Cohorts', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'finance', label: 'Financial Ops', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'operations', label: 'Logistics & Care', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'communication', label: 'Broadcast', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' }
  ];

  private searchSubject = new Subject<{ query: string; category: string }>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(100),
      distinctUntilChanged((prev, curr) => prev.query === curr.query && prev.category === curr.category),
      switchMap(({ query, category }) => this.searchService.search(query, category))
    ).subscribe(results => {
      this.results.set(results);
      this.selectedIndex.set(0);
    });

    // Auto focus input when opened
    effect(() => {
      if (this.searchService.isOpen()) {
        this.query.set('');
        this.activeCategory.set('all');
        this.searchSubject.next({ query: '', category: 'all' });
        setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchService.toggle();
    } else if (event.key === 'Escape' && this.searchService.isOpen()) {
      event.preventDefault();
      this.searchService.close();
    }
  }

  close() {
    this.searchService.close();
  }

  onSearch(q: string) {
    this.query.set(q);
    this.searchSubject.next({ query: q, category: this.activeCategory() });
  }

  setCategory(catId: string) {
    this.activeCategory.set(catId);
    this.searchSubject.next({ query: this.query(), category: catId });
    this.searchInput?.nativeElement.focus();
  }

  moveSelection(step: number) {
    const next = this.selectedIndex() + step;
    const count = this.results().length;
    if (count === 0) return;
    this.selectedIndex.set((next + count) % count);
  }

  selectItem() {
    const item = this.results()[this.selectedIndex()];
    if (item) {
      this.navigateTo(item.path);
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.close();
  }
}

