import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService, Resource, Booking, ResourceType } from '../../../core/infrastructure/resource/resource.service';
import { BookingModalComponent } from '../../../shared/components/booking-modal/booking-modal.component';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
    selector: 'app-resource-list',
    standalone: true,
    imports: [CommonModule, FormsModule, BookingModalComponent, QRCodeComponent],
    templateUrl: './resource-list.component.html',
    styleUrl: './resource-list.component.css'
})
export class ResourceListComponent implements OnInit {
    private resourceService = inject(ResourceService);
    private dialogService = inject(DialogService);

    // Core Data Signals
    resources = signal<Resource[]>([]);
    myBookings = signal<Booking[]>([]);
    allBookings = signal<Booking[]>([]);
    isLoading = signal<boolean>(true);
    isActionLoading = signal<boolean>(false);
    toastMessage = signal<string | null>(null);
    errorMessage = signal<string | null>(null);

    // Active View Mode
    activeView = signal<'resources' | 'my-bookings' | 'all-schedule'>('resources');

    // Filter Signals
    searchQuery = signal<string>('');
    selectedCategory = signal<string>('ALL');
    selectedStatus = signal<string>('ALL');

    // Modals
    selectedResourceForBooking = signal<Resource | null>(null);
    selectedResourceForQr = signal<Resource | null>(null);
    isAssetFormOpen = signal<boolean>(false);
    isEditingAsset = signal<boolean>(false);
    
    // Asset Form Model
    assetForm: Partial<Resource> = {
        name: '',
        type: 'LAB',
        location: '',
        capacity: 30,
        quantity: 1,
        status: 'AVAILABLE',
        custodian: '',
        tags: '',
        description: ''
    };

    // Category Quick Filters
    categories = [
        { id: 'ALL', label: 'All Assets', icon: 'fas fa-layer-group' },
        { id: 'LAB', label: 'Labs & Studios', icon: 'fas fa-flask' },
        { id: 'EQUIPMENT', label: 'Equipment & AV', icon: 'fas fa-laptop-code' },
        { id: 'ROOM', label: 'Halls & Spaces', icon: 'fas fa-door-open' },
        { id: 'VEHICLE', label: 'Fleet & Shuttles', icon: 'fas fa-bus-alt' },
        { id: 'SPORTS', label: 'Sports & Arena', icon: 'fas fa-basketball-ball' },
        { id: 'BOOK', label: 'Curriculum Kits', icon: 'fas fa-book' }
    ];

    // Computed Stats
    totalResourcesCount = computed(() => this.resources().length);
    labsCount = computed(() => this.resources().filter(r => r.type === 'LAB').length);
    equipmentCount = computed(() => this.resources().filter(r => r.type === 'EQUIPMENT').length);
    roomsCount = computed(() => this.resources().filter(r => r.type === 'ROOM' || r.type === 'SPORTS' || r.type === 'VEHICLE').length);
    activeBookingsCount = computed(() => this.myBookings().filter(b => b.status === 'CONFIRMED').length);

    // Filtered Resources
    filteredResources = computed(() => {
        let list = this.resources();
        const query = this.searchQuery().trim().toLowerCase();
        const cat = this.selectedCategory();
        const status = this.selectedStatus();

        if (cat !== 'ALL') {
            list = list.filter(r => r.type === cat);
        }

        if (status !== 'ALL') {
            list = list.filter(r => (r.status || 'AVAILABLE') === status);
        }

        if (query) {
            list = list.filter(r => 
                r.name.toLowerCase().includes(query) ||
                (r.description && r.description.toLowerCase().includes(query)) ||
                (r.location && r.location.toLowerCase().includes(query)) ||
                (r.custodian && r.custodian.toLowerCase().includes(query)) ||
                (r.tags && r.tags.toLowerCase().includes(query))
            );
        }

        return list;
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        this.resourceService.getResources().subscribe({
            next: (data) => {
                this.resources.set(data || []);
                this.isLoading.set(false);
                // Auto seed if completely empty
                if (!data || data.length === 0) {
                    this.seedSamples(false);
                }
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
        this.loadBookings();
    }

    loadBookings() {
        this.resourceService.getMyBookings().subscribe({
            next: (data) => this.myBookings.set(data || []),
            error: () => {}
        });
        this.resourceService.getAllBookings().subscribe({
            next: (data) => this.allBookings.set(data || []),
            error: () => {}
        });
    }

    seedSamples(showToast = true) {
        this.isActionLoading.set(true);
        this.resourceService.seedDefaults().subscribe({
            next: (data) => {
                this.resources.set(data || []);
                this.isActionLoading.set(false);
                if (showToast) {
                    this.showToast('Sample campus assets provisioned successfully!');
                }
            },
            error: () => {
                this.isActionLoading.set(false);
            }
        });
    }

    openCreateAssetModal() {
        this.isEditingAsset.set(false);
        this.assetForm = {
            name: '',
            type: 'LAB',
            location: '',
            capacity: 30,
            quantity: 1,
            status: 'AVAILABLE',
            custodian: '',
            tags: '',
            description: ''
        };
        this.isAssetFormOpen.set(true);
    }

    openEditAssetModal(res: Resource, event?: Event) {
        if (event) event.stopPropagation();
        this.isEditingAsset.set(true);
        this.assetForm = { ...res };
        this.isAssetFormOpen.set(true);
    }

    closeAssetFormModal() {
        this.isAssetFormOpen.set(false);
    }

    saveAsset() {
        if (!this.assetForm.name) {
            this.errorMessage.set('Asset name is required.');
            return;
        }

        this.isActionLoading.set(true);
        if (this.isEditingAsset() && this.assetForm.id) {
            this.resourceService.updateResource(this.assetForm.id, this.assetForm).subscribe({
                next: () => {
                    this.isActionLoading.set(false);
                    this.isAssetFormOpen.set(false);
                    this.showToast('Resource asset updated successfully!');
                    this.loadData();
                },
                error: (err) => {
                    this.isActionLoading.set(false);
                    this.errorMessage.set(err.error?.error || 'Failed to update asset');
                }
            });
        } else {
            this.resourceService.createResource(this.assetForm).subscribe({
                next: () => {
                    this.isActionLoading.set(false);
                    this.isAssetFormOpen.set(false);
                    this.showToast('New campus asset provisioned successfully!');
                    this.loadData();
                },
                error: (err) => {
                    this.isActionLoading.set(false);
                    this.errorMessage.set(err.error?.error || 'Failed to create asset');
                }
            });
        }
    }

    deleteAsset(res: Resource, event: Event) {
        event.stopPropagation();
        this.dialogService.confirm(
            `Are you sure you want to decommission and remove <strong>"${res.name}"</strong> from the physical resource ledger? This action cannot be undone.`,
            'Decommission Asset',
            'danger',
            'Decommission'
        ).subscribe((confirmed: boolean) => {
            if (!confirmed) return;

            this.resourceService.deleteResource(res.id).subscribe({
                next: () => {
                    this.showToast(`Asset "${res.name}" decommissioned successfully.`);
                    this.loadData();
                },
                error: () => {
                    this.dialogService.alert('Failed to decommission resource asset. Please try again.', 'Error', 'error');
                }
            });
        });
    }

    openBooking(res: Resource) {
        this.selectedResourceForBooking.set(res);
    }

    closeBooking() {
        this.selectedResourceForBooking.set(null);
    }

    onBookingConfirmed() {
        this.showToast('Reservation confirmed successfully!');
        this.loadBookings();
    }

    cancelBooking(bookingId: string) {
        this.dialogService.confirm(
            'Are you sure you want to cancel this reservation? The slot will immediately be made available for other faculty and staff.',
            'Cancel Reservation',
            'warning',
            'Cancel Booking'
        ).subscribe((confirmed: boolean) => {
            if (!confirmed) return;

            this.resourceService.cancelBooking(bookingId).subscribe({
                next: () => {
                    this.showToast('Reservation cancelled successfully.');
                    this.loadBookings();
                },
                error: () => {
                    this.dialogService.alert('Failed to cancel reservation.', 'Error', 'error');
                }
            });
        });
    }

    openQrModal(res: Resource, event: Event) {
        event.stopPropagation();
        this.selectedResourceForQr.set(res);
    }

    closeQrModal() {
        this.selectedResourceForQr.set(null);
    }

    getAssetQrPayload(res: Resource): string {
        return JSON.stringify({
            id: res.id,
            name: res.name,
            type: res.type,
            location: res.location,
            action: 'CHECKOUT_RESOURCE'
        });
    }

    printQrTag() {
        window.print();
    }

    showToast(msg: string) {
        this.toastMessage.set(msg);
        setTimeout(() => this.toastMessage.set(null), 3500);
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    getDuration(start: string, end: string): string {
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }
}
