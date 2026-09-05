import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Grade, GradeWeight, GradeTrajectoryPoint } from '../../domain/grade.model';
import { OfflineSyncService } from '../offline/offline-sync.service';

@Injectable({
    providedIn: 'root'
})
export class GradeService {
    private apiUrl = '/api/grades';

    constructor(private http: HttpClient, private offlineSync: OfflineSyncService) { }

    getGradesForStudent(studentId: string): Observable<Grade[]> {
        return this.http.get<Grade[]>(`${this.apiUrl}/student/${studentId}`);
    }

    getGradesForClass(classId: string): Observable<Grade[]> {
        return this.http.get<Grade[]>(`${this.apiUrl}/class/${classId}`);
    }

    getStudentGradeTrajectory(studentId: string): Observable<GradeTrajectoryPoint[]> {
        return this.http.get<GradeTrajectoryPoint[]>(`${this.apiUrl}/student/${studentId}/trajectory`);
    }

    getGradeWeights(classId: string): Observable<GradeWeight[]> {
        return this.http.get<GradeWeight[]>(`${this.apiUrl}/weights/${classId}`);
    }

    getGeneralWeights(): Observable<GradeWeight[]> {
        return this.http.get<GradeWeight[]>(`${this.apiUrl}/weights/general`);
    }

    upsertGradeWeight(weight: GradeWeight): Observable<GradeWeight> {
        return this.http.post<GradeWeight>(`${this.apiUrl}/weights`, weight);
    }

    updateClassWeights(classId: string, weights: GradeWeight[]): Observable<any> {
        return this.http.put(`${this.apiUrl}/weights/${classId}`, weights);
    }

    updateGeneralWeights(weights: GradeWeight[]): Observable<any> {
        return this.http.put(`${this.apiUrl}/weights/general`, weights);
    }

    resetClassWeights(classId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/weights/${classId}`);
    }

    getGrade(id: string): Observable<Grade> {
        return this.http.get<Grade>(`${this.apiUrl}/${id}`);
    }

    addGrade(grade: Partial<Grade>): Observable<Grade> {
        if (!navigator.onLine) {
            this.offlineSync.queueOperation('POST', this.apiUrl, grade);
            return of(grade as Grade);
        }
        return this.http.post<Grade>(this.apiUrl, grade);
    }

    updateGrade(id: string, grade: Partial<Grade>): Observable<Grade> {
        if (!navigator.onLine) {
            this.offlineSync.queueOperation('PUT', `${this.apiUrl}/${id}`, grade);
            return of(grade as Grade);
        }
        return this.http.put<Grade>(`${this.apiUrl}/${id}`, grade);
    }

    deleteGrade(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    bulkCreateGrades(grades: Partial<Grade>[]): Observable<{ imported: number, errors: string[] }> {
        if (!navigator.onLine) {
            this.offlineSync.queueOperation('POST', `${this.apiUrl}/bulk`, grades);
            return of({ imported: grades.length, errors: [] });
        }
        return this.http.post<{ imported: number, errors: string[] }>(`${this.apiUrl}/bulk`, grades);
    }

    generateTerminalReport(studentId: string, periodId?: string, termId?: string): Observable<Blob> {
        // Fallback to empty strings if not provided; backend returns 400 if missing, but we'll try to pass what we can
        // Usually UI should pass these, but we adapt.
        const query = (periodId && termId) ? `?period_id=${periodId}&term_id=${termId}` : '';
        return this.http.get(`/api/reports/students/${studentId}/terminal${query}`, {
            responseType: 'blob'
        });
    }
}
