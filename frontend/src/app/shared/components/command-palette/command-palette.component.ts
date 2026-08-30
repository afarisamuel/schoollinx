import { Component, HostListener, signal, inject, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SearchService, SearchResult } from '../../../core/infrastructure/search/search.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

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

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap(q => this.searchService.search(q))
    ).subscribe(results => {
      this.results.set(results);
      this.selectedIndex.set(0);
    });

    // Auto focus input when opened
    effect(() => {
      if (this.searchService.isOpen()) {
        this.query.set('');
        this.searchSubject.next('');
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
    this.searchSubject.next(q);
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
