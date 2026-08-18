import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ResourceType = 'BOOK' | 'LAB' | 'EQUIPMENT';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Resource {
    id: string;
    name: string;
    type: ResourceType;
    description: string;
}

export interface Booking {
    id: string;
    resource_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
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

    bookResource(resourceId: string, startTime: Date, endTime: Date): Observable<Booking> {
        return this.http.post<Booking>(`${this.apiUrl}/bookings`, {
            resource_id: resourceId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        });
    }

    getMyBookings(): Observable<Booking[]> {
        return this.http.get<Booking[]>(`${this.apiUrl}/bookings/me`);
    }
}
