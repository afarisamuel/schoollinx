import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryItem, VisitorLog, Room, RoomBooking } from '../../domain/facility.model';

@Injectable({
    providedIn: 'root'
})
export class FacilityService {
    private http = inject(HttpClient);
    private apiUrl = '/api/facility';

    // Inventory / Assets
    getInventory(): Observable<InventoryItem[]> {
        return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`);
    }

    addInventoryItem(item: Partial<InventoryItem>): Observable<InventoryItem> {
        return this.http.post<InventoryItem>(`${this.apiUrl}/inventory`, item);
    }

    updateAsset(id: string, item: Partial<InventoryItem>): Observable<InventoryItem> {
        return this.http.put<InventoryItem>(`${this.apiUrl}/inventory/${id}`, item);
    }

    adjustInventory(id: string, quantity: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/inventory/${id}/quantity`, { quantity });
    }

    deleteInventoryItem(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/inventory/${id}`);
    }

    // Visitors
    getVisitors(date?: string): Observable<VisitorLog[]> {
        const params = date ? `?date=${date}` : '';
        return this.http.get<VisitorLog[]>(`${this.apiUrl}/visitors${params}`);
    }

    checkInVisitor(visitor: Partial<VisitorLog>): Observable<VisitorLog> {
        return this.http.post<VisitorLog>(`${this.apiUrl}/visitors/check-in`, visitor);
    }

    checkOutVisitor(id: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/visitors/${id}/check-out`, {});
    }

    // Rooms & Bookings
    getRooms(): Observable<Room[]> {
        return this.http.get<Room[]>(`${this.apiUrl}/rooms`);
    }

    addRoom(room: Partial<Room>): Observable<Room> {
        return this.http.post<Room>(`${this.apiUrl}/rooms`, room);
    }

    getRoomSchedule(roomId: string, date: string): Observable<RoomBooking[]> {
        return this.http.get<RoomBooking[]>(`${this.apiUrl}/rooms/${roomId}/schedule?date=${date}`);
    }

    bookRoom(roomId: string, booking: Partial<RoomBooking>): Observable<RoomBooking> {
        return this.http.post<RoomBooking>(`${this.apiUrl}/rooms/${roomId}/book`, booking);
    }

    cancelBooking(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/bookings/${id}`);
    }
}
