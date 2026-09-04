import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface InstitutionalKPI {
    total_students: number;
    total_teachers: number;
    total_guardians?: number;
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

export interface AtRiskStudent {
    student_id: string;
    student_name: string;
    class_name: string;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    risk_score: number;
    attendance_pct: number;
    average_score: number;
    fee_arrears_ghs: number;
    demerit_count: number;
    primary_drivers: string[];
    recommended_plan: string;
}

export interface NaturalQueryResponse {
    prompt: string;
    answer: string;
    confidence_score: number;
    data_points: any;
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

    getAtRiskStudents(): Observable<AtRiskStudent[]> {
        return this.http.get<AtRiskStudent[]>(`${this.apiUrl}/at-risk-students`).pipe(map(res => res || []));
    }

    askNaturalLanguageQuery(prompt: string): Observable<NaturalQueryResponse> {
        return this.http.post<NaturalQueryResponse>(`${this.apiUrl}/natural-query`, { prompt });
    }
}
