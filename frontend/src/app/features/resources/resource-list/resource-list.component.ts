import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService, Resource, Booking } from '../../../core/infrastructure/resource/resource.service';
import { BookingModalComponent } from '../../../shared/components/booking-modal/booking-modal.component';

@Component({
    selector: 'app-resource-list',
    standalone: true,
    imports: [CommonModule, BookingModalComponent],
    templateUrl: './resource-list.component.html',
    styleUrl: './resource-list.component.css'
})
export class ResourceListComponent implements OnInit {
    private resourceService = inject(ResourceService);

    resources = signal<Resource[]>([]);
    myBookings = signal<Booking[]>([]);
    viewMyBookings = false;
    selectedResource = signal<Resource | null>(null);

    ngOnInit() {
        this.resourceService.getResources().subscribe(data => {
            this.resources.set(data);
        });
        this.loadBookings();
    }

    loadBookings() {
        this.resourceService.getMyBookings().subscribe(data => {
            this.myBookings.set(data);
        });
    }

    countByType(type: string): number {
        return this.resources().filter(r => r.type === type).length;
    }

    getResourceName(id: string): string {
        return this.resources().find(r => r.id === id)?.name || 'Unknown Resource';
    }

    getDuration(start: string, end: string): string {
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    openBooking(res: Resource) {
        this.selectedResource.set(res);
    }

    closeBooking() {
        this.selectedResource.set(null);
    }
}
