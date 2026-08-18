import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './contact.component.html',
    styleUrl: './contact.component.css'
})
export class ContactComponent {
    submitted = false;
    isSubmitting = signal(false);
    errorMessage = signal('');

    form = signal({
        full_name: '',
        work_email: '',
        school_name: '',
        message: ''
    });

    constructor(private http: HttpClient) {}

    onSubmit(e: Event) {
        e.preventDefault();
        const data = this.form();
        if (!data.full_name || !data.work_email || !data.school_name) {
            this.errorMessage.set('Please fill in all required fields.');
            return;
        }
        this.isSubmitting.set(true);
        this.errorMessage.set('');

        this.http.post(`${environment.apiUrl}/public/contact`, data).subscribe({
            next: () => {
                this.submitted = true;
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.errorMessage.set(err?.error?.error || 'Something went wrong. Please try again.');
                this.isSubmitting.set(false);
            }
        });
    }

    resetForm() {
        this.submitted = false;
        this.form.set({ full_name: '', work_email: '', school_name: '', message: '' });
        this.errorMessage.set('');
    }
}
