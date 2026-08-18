import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student, Guardian } from '../../domain/student.model';
import { AcademicInsight } from '../insights/insights.service';

@Injectable({
    providedIn: 'root'
})
export class GuardianService {
    private http = inject(HttpClient);
    private parentApiUrl = '/api/guardian';
    private adminApiUrl = '/api/guardians';

    // === Parent Portal endpoints ===
    getProfile(): Observable<Guardian> {
        return this.http.get<Guardian>(`${this.parentApiUrl}/profile`);
    }

    getChildren(): Observable<Student[]> {
        return this.http.get<Student[]>(`${this.parentApiUrl}/children`);
    }

    getChildAcademics(studentId: string): Observable<AcademicInsight[]> {
        return this.http.get<AcademicInsight[]>(`${this.parentApiUrl}/child/${studentId}/academics`);
    }

    // === Admin/Teacher endpoints ===
    createGuardian(guardian: Guardian): Observable<Guardian> {
        return this.http.post<Guardian>(this.adminApiUrl, guardian);
    }

    updateGuardian(id: string, guardian: Guardian): Observable<Guardian> {
        return this.http.put<Guardian>(`${this.adminApiUrl}/${id}`, guardian);
    }

    resetPassword(id: string): Observable<{ message: string; password: string }> {
        return this.http.post<{ message: string; password: string }>(`${this.adminApiUrl}/${id}/reset-password`, {});
    }
}
