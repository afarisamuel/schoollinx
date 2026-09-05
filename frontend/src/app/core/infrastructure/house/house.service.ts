import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface House {
    id: string;
    name: string;
    color: string;
    crest: string;
    description: string;
    total_points: number;
    member_count: number;
    rank: number;
}

@Injectable({
    providedIn: 'root'
})
export class HouseService {
    private http = inject(HttpClient);
    private apiUrl = '/api/houses';

    getAll(): Observable<House[]> {
        return this.http.get<House[]>(this.apiUrl);
    }

    getLeaderboard(): Observable<House[]> {
        return this.http.get<House[]>(`${this.apiUrl}/leaderboard`).pipe(
            map(houses => houses || [])
        );
    }

    create(house: Partial<House>): Observable<House> {
        return this.http.post<House>(this.apiUrl, house);
    }

    update(id: string, house: Partial<House>): Observable<House> {
        return this.http.put<House>(`${this.apiUrl}/${id}`, house);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    assignStudent(studentId: string, houseId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/assign`, { student_id: studentId, house_id: houseId });
    }

    getStudentHouse(studentId: string): Observable<House | null> {
        return this.http.get<House | null>(`${this.apiUrl}/student/${studentId}`);
    }
}
