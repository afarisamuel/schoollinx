import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ClubCategory = 'SPORTS' | 'ARTS' | 'ACADEMIC' | 'SOCIAL';

export interface Club {
    id: string;
    name: string;
    description: string;
    teacher_id: string;
    category: ClubCategory;
    isJoined?: boolean; // UI state
}

export interface ClubEvent {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
    club_id?: string;
    club_name?: string; // Enhanced for UI
}

@Injectable({
    providedIn: 'root'
})
export class ExtracurricularService {
    private http = inject(HttpClient);
    private apiUrl = '/api/extracurricular';

    getClubs(): Observable<Club[]> {
        return this.http.get<Club[]>(`${this.apiUrl}/clubs`);
    }

    getMyClubs(): Observable<Club[]> {
        return this.http.get<Club[]>(`${this.apiUrl}/my-clubs`);
    }

    joinClub(clubId: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/clubs/${clubId}/join`, {});
    }

    leaveClub(clubId: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/clubs/${clubId}/leave`, {});
    }

    getEvents(): Observable<ClubEvent[]> {
        return this.http.get<ClubEvent[]>(`${this.apiUrl}/events`);
    }

    scheduleEvent(event: Partial<ClubEvent>): Observable<ClubEvent> {
        return this.http.post<ClubEvent>(`${this.apiUrl}/events`, event);
    }
}
