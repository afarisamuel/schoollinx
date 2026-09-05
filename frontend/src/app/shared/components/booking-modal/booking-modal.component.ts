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

    bookingDate = signal<string>(new Date().toISOString().split('T')[0]);
    startTime = signal<string>('09:00');
    endTime = signal<string>('11:00');
    purpose = signal<string>('');
    headcount = signal<number>(25);
    notes = signal<string>('');

    isSubmitting = signal<boolean>(false);
    error = signal<string | null>(null);

    // Preset Quick Time Slots
    presetSlots = [
        { label: 'Morning Period 1', start: '08:00', end: '10:00' },
        { label: 'Mid-Morning Lab', start: '10:30', end: '12:30' },
        { label: 'Afternoon Practical', start: '13:30', end: '15:30' },
        { label: 'After-School Session', start: '16:00', end: '18:00' }
    ];

    applyPreset(slot: { start: string, end: string }) {
        this.startTime.set(slot.start);
        this.endTime.set(slot.end);
    }

    submit() {
        if (!this.resource || !this.bookingDate() || !this.startTime() || !this.endTime()) return;

        const startIso = new Date(`${this.bookingDate()}T${this.startTime()}:00`).toISOString();
        const endIso = new Date(`${this.bookingDate()}T${this.endTime()}:00`).toISOString();

        this.isSubmitting.set(true);
        this.error.set(null);

        this.resourceService.bookResource({
            resource_id: this.resource.id,
            start_time: startIso,
            end_time: endIso,
            purpose: this.purpose() || 'Academic & Practical Session',
            headcount: this.headcount() || 1,
            notes: this.notes()
        }).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.confirmed.emit();
                this.close.emit();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.error.set(err.error?.error || 'Failed to book resource. The slot may be already taken.');
            }
        });
    }
}
