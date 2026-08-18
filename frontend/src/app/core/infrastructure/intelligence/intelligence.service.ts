import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface InstitutionalKPI {
    total_students: number;
    total_teachers: number;
    average_gpa: number;
    average_attendance: number;
    total_revenue: number;
    library_loans: number;
    active_academic_year: string;
    active_term: string;
    term_count: number;
    total_levels: number;
}

export interface RetentionRisk {
    student_id: string;
    student_name: string;
    risk_score: number;
    primary_factors: string[];
}

export interface CourseDemand {
    subject_id: string;
    subject_name: string;
    current_enrollment: number;
    projected_demand: number;
    teacher_shortage: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class IntelligenceService {
    private http = inject(HttpClient);
    private apiUrl = '/api/intelligence';

    getKPIs(): Observable<InstitutionalKPI> {
        return this.http.get<InstitutionalKPI>(`${this.apiUrl}/kpis`);
    }

    getRetentionRisks(): Observable<RetentionRisk[]> {
        return this.http.get<RetentionRisk[]>(`${this.apiUrl}/predictions/retention`).pipe(map(res => res || []));
    }

    getCourseDemand(): Observable<CourseDemand[]> {
        return this.http.get<CourseDemand[]>(`${this.apiUrl}/predictions/demand`).pipe(map(res => res || []));
    }
}
