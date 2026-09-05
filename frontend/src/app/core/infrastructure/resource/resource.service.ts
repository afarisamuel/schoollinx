import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ResourceType = 'BOOK' | 'LAB' | 'EQUIPMENT' | 'ROOM' | 'VEHICLE' | 'SPORTS';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Resource {
    id: string;
    name: string;
    type: ResourceType;
    description?: string;
    location?: string;
    capacity?: number;
    quantity?: number;
    status?: 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE';
    custodian?: string;
    image_url?: string;
    tags?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Booking {
    id: string;
    resource_id: string;
    resource_name?: string;
    resource_type?: string;
    user_id: string;
    user_name?: string;
    start_time: string;
    end_time: string;
    purpose?: string;
    headcount?: number;
    notes?: string;
    status: BookingStatus;
    created_at?: string;
}

export interface BookingRequest {
    resource_id: string;
    start_time: string;
    end_time: string;
    purpose?: string;
    headcount?: number;
    notes?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResourceService {
    private http = inject(HttpClient);
    private apiUrl = '/api/resources';

    getResources(): Observable<Resource[]> {
        return this.http.get<Resource[]>(this.apiUrl);
    }

    getResource(id: string): Observable<Resource> {
        return this.http.get<Resource>(`${this.apiUrl}/${id}`);
    }

    createResource(resource: Partial<Resource>): Observable<Resource> {
        return this.http.post<Resource>(this.apiUrl, resource);
    }

    updateResource(id: string, resource: Partial<Resource>): Observable<Resource> {
        return this.http.put<Resource>(`${this.apiUrl}/${id}`, resource);
    }

    deleteResource(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }

    seedDefaults(): Observable<Resource[]> {
        return this.http.post<Resource[]>(`${this.apiUrl}/seed-defaults`, {});
    }

    bookResource(booking: BookingRequest): Observable<Booking> {
        return this.http.post<Booking>(`${this.apiUrl}/bookings`, booking);
    }

    cancelBooking(bookingId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/bookings/${bookingId}/cancel`, {});
    }

    getMyBookings(): Observable<Booking[]> {
        return this.http.get<Booking[]>(`${this.apiUrl}/bookings/me`);
    }

    getAllBookings(): Observable<Booking[]> {
        return this.http.get<Booking[]>(`${this.apiUrl}/bookings/all`);
    }
}
