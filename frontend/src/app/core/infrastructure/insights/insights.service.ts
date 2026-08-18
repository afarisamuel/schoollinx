import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AcademicInsight {
    id: string;
    student_id: string;
    type: 'SUBJECT' | 'CAREER' | 'RISK' | 'ENRICHMENT';
    title: string;
    description: string;
    confidence_score: number;
    reasoning: string;
    suggested_subject_id?: string;
}

export interface StudentSuccessScore {
    student_id: string;
    first_name: string;
    last_name: string;
    gpa: number;
    attendance_rate: number;
    composite_score: number;
    risk_level: 'High' | 'Medium' | 'Low';
    fee_debt: number;
    reasons: string[];
}

@Injectable({
    providedIn: 'root'
})
export class InsightsService {
    private http = inject(HttpClient);
    private apiUrl = '/api/insights';

    getStudentInsights(studentId: string): Observable<AcademicInsight[]> {
        return this.http.get<AcademicInsight[]>(`${this.apiUrl}/students/${studentId}`).pipe(map(res => res || []));
    }

    getSuccessScore(studentId: string): Observable<StudentSuccessScore> {
        return this.http.get<StudentSuccessScore>(`${this.apiUrl}/students/${studentId}/score`);
    }

    getAtRiskStudents(): Observable<StudentSuccessScore[]> {
        return this.http.get<StudentSuccessScore[]>(`${this.apiUrl}/at-risk`).pipe(map(res => res || []));
    }
}
