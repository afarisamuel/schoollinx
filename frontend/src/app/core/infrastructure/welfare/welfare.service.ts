import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HealthRecord, BehaviorLog } from '../../domain/welfare.model';

@Injectable({
    providedIn: 'root'
})
export class WelfareService {
    private http = inject(HttpClient);
    private apiUrl = '/api/welfare';

    // Health
    getStudentHealth(studentId: string): Observable<HealthRecord> {
        return this.http.get<HealthRecord>(`${this.apiUrl}/health/student/${studentId}`);
    }

    updateHealth(record: Partial<HealthRecord>): Observable<HealthRecord> {
        return this.http.put<HealthRecord>(`${this.apiUrl}/health`, record);
    }

    // Behavior
    getStudentBehavior(studentId: string): Observable<BehaviorLog[]> {
        return this.http.get<BehaviorLog[]>(`${this.apiUrl}/behavior/student/${studentId}`);
    }

    logBehavior(log: Partial<BehaviorLog>): Observable<BehaviorLog> {
        return this.http.post<BehaviorLog>(`${this.apiUrl}/behavior`, log);
    }

    deleteBehavior(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/behavior/${id}`);
    }
}
