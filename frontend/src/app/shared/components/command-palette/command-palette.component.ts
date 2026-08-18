import { Component, HostListener, signal, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
export class CommandPaletteComponent implements AfterViewInit {
    private searchService = inject(SearchService);
    private router = inject(Router);

    @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

    isOpen = signal(false);
    results = signal<SearchResult[]>([]);
    selectedIndex = signal(0);
    query = signal('');

    private searchSubject = new Subject<string>();

    constructor() {
        this.searchSubject.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(q => this.searchService.search(q))
        ).subscribe(results => {
            this.results.set(results);
            this.selectedIndex.set(0);
        });
    }

    ngAfterViewInit() {
        // Focus handles by signal effect or direct logic when opened
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.toggle();
        }
    }

    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen.set(true);
        this.query.set('');
        this.results.set([]);
        setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    }

    close() {
        this.isOpen.set(false);
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
