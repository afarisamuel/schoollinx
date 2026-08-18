import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlumniProfile {
    id: string;
    student_id: string;
    higher_ed: string;
    current_career: string;
    linkedin_url: string;
    updated_at: string;
}

export interface AlumniLegacy {
    student: any;
    profile: AlumniProfile;
}

@Injectable({
    providedIn: 'root'
})
export class AlumniService {
    private http = inject(HttpClient);
    private apiUrl = '/api/alumni';

    getAlumni(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getAlumniLegacy(id: string): Observable<AlumniLegacy> {
        return this.http.get<AlumniLegacy>(`${this.apiUrl}/${id}`);
    }

    graduateStudent(id: string, profile: Partial<AlumniProfile>): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/${id}/graduate`, profile);
    }
}
