import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LibraryService, LibraryLoan } from '../../../core/infrastructure/library/library.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-lending-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './lending-dashboard.component.html',
    styleUrl: './lending-dashboard.component.css'
})
export class LendingDashboardComponent implements OnInit {
    private libraryService = inject(LibraryService);
    private dialog = inject(DialogService);

    activeLoans = signal<LibraryLoan[]>([]);

    overdueCount = computed(() => this.activeLoans().filter(l => this.isOverdue(l.due_date)).length);
    loanedCount = computed(() => this.activeLoans().filter(l => l.status.toLowerCase() === 'loaned').length);
    returnedCount = computed(() => this.activeLoans().filter(l => l.status.toLowerCase() === 'returned').length);

    ngOnInit() {
        this.loadLoans();
    }

    loadLoans() {
        this.libraryService.getActiveLoans().subscribe(data => {
            this.activeLoans.set(data);
        });
    }

    isOverdue(dueDate: string): boolean {
        return new Date(dueDate) < new Date();
    }

    returnBook(loanId: string) {
        this.dialog.confirm('Process book return?', 'Book Return', 'info', 'Process Return').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.libraryService.returnBook(loanId).subscribe(() => {
                    this.loadLoans();
                });
            }
        });
    }

    auditOverdue() {
        this.libraryService.auditOverdue().subscribe(() => {
            this.dialog.alert('Overdue audit complete. Fines have been generated for overdue items.', 'Audit Complete', 'success').subscribe();
            this.loadLoans();
        });
    }
}
