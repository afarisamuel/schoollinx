import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibraryService, LibraryBook } from '../../../core/infrastructure/library/library.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-book-catalog',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './book-catalog.component.html',
    styleUrl: './book-catalog.component.css'
})
export class BookCatalogComponent implements OnInit {
    private libraryService = inject(LibraryService);
    private authService = inject(AuthService);
    private dialog = inject(DialogService);

    books = signal<LibraryBook[]>([]);
    searchQuery = signal<string>('');
    selectedCategory = signal<string>('ALL');
    selectedAvailability = signal<'ALL' | 'AVAILABLE' | 'LOANED'>('ALL');
    viewMode = signal<'grid' | 'table'>('grid');
    isLoading = signal<boolean>(false);

    isAdmin = computed(() => {
        const role = this.authService.currentUserValue?.role;
        return role === 'ADMIN' || role === 'ECOPOWER_ADMIN' || role === 'TEACHER';
    });

    categories = computed(() => {
        const list = this.books().map(b => b.category).filter(Boolean);
        return Array.from(new Set(list));
    });

    availableCount = computed(() => this.books().filter(b => b.available_copies > 0).length);
    loanedCount = computed(() => this.books().reduce((acc, b) => acc + Math.max(0, (b.total_copies - b.available_copies)), 0));
    totalCopiesCount = computed(() => this.books().reduce((acc, b) => acc + (b.total_copies || 0), 0));
    categoryCount = computed(() => this.categories().length);

    circulationRate = computed(() => {
        const total = this.totalCopiesCount();
        if (total === 0) return 0;
        return Math.round((this.loanedCount() / total) * 100);
    });

    filteredBooks = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const category = this.selectedCategory();
        const availability = this.selectedAvailability();

        return this.books().filter(book => {
            const matchesQuery = !query ||
                book.title?.toLowerCase().includes(query) ||
                book.author?.toLowerCase().includes(query) ||
                book.isbn?.toLowerCase().includes(query) ||
                book.barcode?.toLowerCase().includes(query) ||
                book.category?.toLowerCase().includes(query);

            if (!matchesQuery) return false;

            if (category !== 'ALL' && book.category !== category) {
                return false;
            }

            if (availability === 'AVAILABLE' && book.available_copies <= 0) {
                return false;
            }
            if (availability === 'LOANED' && book.available_copies === book.total_copies) {
                return false;
            }

            return true;
        });
    });

    ngOnInit() {
        this.loadBooks();
    }

    loadBooks(query: string = '') {
        this.isLoading.set(true);
        this.libraryService.getBooks(query).subscribe({
            next: (data) => {
                this.books.set(data || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    onSearch(event: any) {
        const query = event.target.value;
        this.searchQuery.set(query);
    }

    setCategory(cat: string) {
        this.selectedCategory.set(cat);
    }

    setAvailability(avail: 'ALL' | 'AVAILABLE' | 'LOANED') {
        this.selectedAvailability.set(avail);
    }

    setViewMode(mode: 'grid' | 'table') {
        this.viewMode.set(mode);
    }

    exportCSV() {
        const list = this.filteredBooks();
        let csv = `Barcode,ISBN,Title,Author,Category,Total Copies,Available Copies,Circulating Copies\n`;
        list.forEach(b => {
            const circulating = Math.max(0, b.total_copies - b.available_copies);
            csv += `"${b.barcode || ''}","${b.isbn || ''}","${(b.title || '').replace(/"/g, '""')}","${(b.author || '').replace(/"/g, '""')}","${b.category || ''}",${b.total_copies},${b.available_copies},${circulating}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Library_Catalog_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    printCatalog() {
        window.print();
    }

    requestLoan(book: LibraryBook) {
        const studentId = this.authService.currentUserValue?.id;
        if (!studentId) {
            this.dialog.alert('Please log in to request a library checkout or loan.', 'Authentication Required', 'warning').subscribe();
            return;
        }

        this.dialog.confirm(`Confirm borrowing request for "${book.title}" by ${book.author}?`, 'Library Loan Confirmation', 'info', 'Confirm Loan').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.libraryService.issueLoan(book.barcode, studentId).subscribe({
                    next: () => {
                        this.dialog.alert(`Loan registered successfully for "${book.title}"! Please collect the physical volume from the librarian desk.`, 'Loan Confirmed', 'success').subscribe();
                        this.loadBooks(this.searchQuery());
                    },
                    error: (err) => {
                        const msg = err.error?.error || 'Unable to issue loan. The title may currently be reserved or unavailable.';
                        this.dialog.alert(msg, 'Loan Request Failed', 'error').subscribe();
                    }
                });
            }
        });
    }

}
