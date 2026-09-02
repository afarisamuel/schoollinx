import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransportRoute, BusAssignment, MealPlan, CanteenSubscription, BusLocation } from '../../domain/logistics.model';

@Injectable({
    providedIn: 'root'
})
export class LogisticsService {
    private http = inject(HttpClient);
    private apiUrl = '/api/logistics';

    // Transport
    getRoutes(): Observable<TransportRoute[]> {
        return this.http.get<TransportRoute[]>(`${this.apiUrl}/routes`);
    }

    addRoute(route: Partial<TransportRoute>): Observable<TransportRoute> {
        return this.http.post<TransportRoute>(`${this.apiUrl}/routes`, route);
    }

    deleteRoute(routeId: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/routes/${routeId}`);
    }

    getRoutePassengers(routeId: string): Observable<BusAssignment[]> {
        return this.http.get<BusAssignment[]>(`${this.apiUrl}/routes/${routeId}/passengers`);
    }

    getStudentTransport(studentId: string): Observable<BusAssignment> {
        return this.http.get<BusAssignment>(`${this.apiUrl}/transport/student/${studentId}`);
    }

    assignTransport(assignment: Partial<BusAssignment>): Observable<BusAssignment> {
        return this.http.post<BusAssignment>(`${this.apiUrl}/transport/assign`, assignment);
    }

    // Canteen
    getMealPlans(): Observable<MealPlan[]> {
        return this.http.get<MealPlan[]>(`${this.apiUrl}/meal-plans`);
    }

    addMealPlan(plan: Partial<MealPlan>): Observable<MealPlan> {
        return this.http.post<MealPlan>(`${this.apiUrl}/meal-plans`, plan);
    }

    getStudentCanteen(studentId: string): Observable<CanteenSubscription> {
        return this.http.get<CanteenSubscription>(`${this.apiUrl}/canteen/student/${studentId}`);
    }

    subscribeCanteen(subscription: Partial<CanteenSubscription>): Observable<CanteenSubscription> {
        return this.http.post<CanteenSubscription>(`${this.apiUrl}/canteen/subscribe`, subscription);
    }

    // Tracking
    getBusLocation(routeId: string): Observable<BusLocation> {
        return this.http.get<BusLocation>(`${this.apiUrl}/routes/${routeId}/location`);
    }

    getBusHistory(routeId: string): Observable<BusLocation[]> {
        return this.http.get<BusLocation[]>(`${this.apiUrl}/routes/${routeId}/location/history`);
    }
}
