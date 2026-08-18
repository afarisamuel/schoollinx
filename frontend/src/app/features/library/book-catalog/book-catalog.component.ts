import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibraryService, LibraryBook } from '../../../core/infrastructure/library/library.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-book-catalog',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './book-catalog.component.html',
    styleUrl: './book-catalog.component.css'
})
export class BookCatalogComponent implements OnInit {
    private libraryService = inject(LibraryService);
    private authService = inject(AuthService);
    private dialog = inject(DialogService);

    books = signal<LibraryBook[]>([]);
    isAdmin = computed(() => this.authService.currentUserValue?.role === 'ADMIN');

    availableCount = computed(() => this.books().filter(b => b.available_copies > 0).length);
    loanedCount = computed(() => this.books().reduce((acc, b) => acc + (b.total_copies - b.available_copies), 0));
    categoryCount = computed(() => new Set(this.books().map(b => b.category)).size);

    ngOnInit() {
        this.loadBooks();
    }

    loadBooks(query: string = '') {
        this.libraryService.getBooks(query).subscribe(data => {
            this.books.set(data);
        });
    }

    onSearch(event: any) {
        const query = event.target.value;
        this.loadBooks(query);
    }

    requestLoan(book: LibraryBook) {
        const studentId = this.authService.currentUserValue?.id;
        if (!studentId) {
            this.dialog.alert('Please log in to request a loan.', 'Authentication Required', 'warning').subscribe();
            return;
        }

        this.dialog.confirm(`Would you like to request a loan for "${book.title}"?`, 'Loan Request', 'info', 'Request Loan').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.libraryService.issueLoan(book.barcode, studentId).subscribe(() => {
                    this.dialog.alert('Loan request successful! Please pick up the book from the library within 24 hours.', 'Loan Confirmed', 'success').subscribe();
                    this.loadBooks();
                });
            }
        });
    }

}
