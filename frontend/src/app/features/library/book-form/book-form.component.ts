import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LibraryService } from '../../../core/infrastructure/library/library.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-book-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './book-form.component.html'
})
export class BookFormComponent {
    private fb = inject(FormBuilder);
    private libraryService = inject(LibraryService);
    private dialog = inject(DialogService);
    private router = inject(Router);

    isSubmitting = false;

    bookForm = this.fb.nonNullable.group({
        title: ['', Validators.required],
        author: ['', Validators.required],
        category: ['', Validators.required],
        isbn: ['', Validators.required],
        barcode: ['', Validators.required],
        total_copies: [1, [Validators.required, Validators.min(1)]]
    });

    get f() {
        return this.bookForm.controls;
    }

    onSubmit() {
        if (this.bookForm.invalid) {
            this.bookForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        const formValue = this.bookForm.getRawValue();

        const newBook = {
            title: formValue.title,
            author: formValue.author,
            category: formValue.category,
            isbn: formValue.isbn,
            barcode: formValue.barcode,
            total_copies: formValue.total_copies,
            available_copies: formValue.total_copies
        };

        this.libraryService.addBook(newBook).subscribe({
            next: () => {
                this.dialog.alert('Book added successfully!', 'Success', 'success').subscribe(() => {
                    this.router.navigate(['/library']);
                });
            },
            error: (err) => {
                this.isSubmitting = false;
                this.dialog.alert('Failed to add book: ' + (err.error?.error || err.message), 'Error', 'error').subscribe();
            }
        });
    }
}
