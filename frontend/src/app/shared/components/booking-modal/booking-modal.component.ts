import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService, Resource } from '../../../core/infrastructure/resource/resource.service';

@Component({
    selector: 'app-booking-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './booking-modal.component.html',
    styleUrl: './booking-modal.component.css'
})
export class BookingModalComponent {
    @Input() resource: Resource | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() confirmed = new EventEmitter<void>();

    private resourceService = inject(ResourceService);

    startTime: string = '';
    endTime: string = '';
    error = signal<string | null>(null);

    submit() {
        if (!this.resource || !this.startTime || !this.endTime) return;

        this.resourceService.bookResource(
            this.resource.id,
            new Date(this.startTime),
            new Date(this.endTime)
        ).subscribe({
            next: () => {
                this.confirmed.emit();
                this.close.emit();
            },
            error: (err) => {
                this.error.set(err.error?.error || 'Failed to book resource');
            }
        });
    }
}
