import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { LibraryService, LibraryBook, LibraryLoan } from '../../../core/infrastructure/library/library.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-library-hub',
    standalone: true,
    imports: [CommonModule, FormsModule, StudentSearchDropdownComponent],
    templateUrl: './library-hub.component.html',
    styleUrl: './library-hub.component.css'
})
export class LibraryHubComponent implements OnInit {
    private libraryService = inject(LibraryService);
    private platformId = inject(PLATFORM_ID);

    // Scanner State
    scanBarcode = '';
    scanStudentId: string | null = null;
    isProcessing = signal(false);
    checkoutSuccess = signal(false);
    checkoutError = signal<string | null>(null);
    processedBookTitle = signal('');

    // Inventory State
    books = signal<LibraryBook[]>([]);
    isLoadingBooks = signal(false);
    searchQuery = '';
    private searchSubject = new Subject<string>();

    // Circulation State
    activeLoans = signal<LibraryLoan[]>([]);
    isLoadingLoans = signal(false);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadBooks();
            this.loadActiveLoans();

            // Setup debounced search for inventory
            this.searchSubject.pipe(
                debounceTime(300),
                distinctUntilChanged()
            ).subscribe(query => {
                this.loadBooks(query);
            });
        }
    }

    onSearch() {
        this.searchSubject.next(this.searchQuery);
    }

    loadBooks(query?: string) {
        this.isLoadingBooks.set(true);
        this.libraryService.getBooks(query).subscribe({
            next: (data) => {
                this.books.set(data);
                this.isLoadingBooks.set(false);
            },
            error: (err) => {
                console.error('Failed to load books', err);
                this.isLoadingBooks.set(false);
            }
        });
    }

    loadActiveLoans() {
        this.isLoadingLoans.set(true);
        this.libraryService.getActiveLoans().subscribe({
            next: (data) => {
                this.activeLoans.set(data);
                this.isLoadingLoans.set(false);
            },
            error: (err) => {
                console.error('Failed to load active loans', err);
                this.isLoadingLoans.set(false);
            }
        });
    }

    processCheckout() {
        // Requires both fields to trigger the scanner checkout
        if (!this.scanBarcode || !this.scanStudentId || this.isProcessing()) {
            return;
        }

        this.isProcessing.set(true);
        this.checkoutError.set(null);
        this.checkoutSuccess.set(false);

        this.libraryService.issueLoan(this.scanBarcode, this.scanStudentId).subscribe({
            next: (loan) => {
                this.isProcessing.set(false);
                this.checkoutSuccess.set(true);
                this.processedBookTitle.set(loan.book?.title || this.scanBarcode);

                // Reset Scanner
                this.scanBarcode = '';

                // Refresh tables to reflect the new checkout
                this.loadBooks(this.searchQuery);
                this.loadActiveLoans();

                // Clear success message after 3 seconds
                setTimeout(() => this.checkoutSuccess.set(false), 3000);
            },
            error: (err) => {
                this.isProcessing.set(false);
                // Display the specific business rule violation (e.g., unpaid fines, max loans)
                this.checkoutError.set(err.error?.error || 'Failed to process checkout due to institutional restrictions.');
            }
        });
    }

    processReturn(loanId: string) {
        this.libraryService.returnBook(loanId).subscribe({
            next: () => {
                // Refresh tables on successful return
                this.loadBooks(this.searchQuery);
                this.loadActiveLoans();
            },
            error: (err) => {
                console.error('Failed to process return', err);
            }
        });
    }
}
