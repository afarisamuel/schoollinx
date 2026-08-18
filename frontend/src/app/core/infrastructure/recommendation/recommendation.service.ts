import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubjectRecommendation {
    id: string;
    student_id: string;
    subject_id: string;
    subject_name: string;
    category: string;
    confidence_score: number;
    rationale: string;
    is_enrichment: boolean;
}

export interface LearningPath {
    student_id: string;
    student_name: string;
    recommendations: SubjectRecommendation[];
    generated_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class RecommendationService {
    private http = inject(HttpClient);
    private apiUrl = '/api/insights';

    getLearningPath(studentId: string): Observable<LearningPath> {
        return this.http.get<LearningPath>(`${this.apiUrl}/students/${studentId}/learning-path`);
    }

    generateForStudent(studentId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/students/${studentId}/generate`, {});
    }

    generateBatchInsights(): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/generate-all`, {});
    }
}
