import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlumniService } from '../../../core/infrastructure/alumni/alumni.service';

@Component({
    selector: 'app-graduation-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './graduation-modal.component.html',
    styleUrl: './graduation-modal.component.css'
})
export class GraduationModalComponent {
    private alumniService = inject(AlumniService);

    @Input({ required: true }) student!: any;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    profile = {
        higher_ed: '',
        current_career: '',
        linkedin_url: ''
    };

    isSubmitting = signal(false);

    submit() {
        this.isSubmitting.set(true);
        this.alumniService.graduateStudent(this.student.id, this.profile).subscribe({
            next: () => {
                this.success.emit();
                this.close.emit();
            },
            error: () => this.isSubmitting.set(false)
        });
    }
}
