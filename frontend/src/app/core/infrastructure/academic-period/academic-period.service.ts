import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcademicPeriod, AcademicTerm } from '../../domain/academic-period.model';
export type { AcademicPeriod, AcademicTerm } from '../../domain/academic-period.model';

@Injectable({
    providedIn: 'root'
})
export class AcademicPeriodService {
    private http = inject(HttpClient);
    private apiUrl = '/api/academic-periods';

    getAll(): Observable<AcademicPeriod[]> {
        return this.http.get<AcademicPeriod[]>(this.apiUrl);
    }

    getById(id: string): Observable<AcademicPeriod> {
        return this.http.get<AcademicPeriod>(`${this.apiUrl}/${id}`);
    }

    getActive(): Observable<AcademicPeriod> {
        return this.http.get<AcademicPeriod>(`${this.apiUrl}/active`);
    }

    create(period: Partial<AcademicPeriod>): Observable<AcademicPeriod> {
        return this.http.post<AcademicPeriod>(this.apiUrl, period);
    }

    update(id: string, period: Partial<AcademicPeriod>): Observable<AcademicPeriod> {
        return this.http.put<AcademicPeriod>(`${this.apiUrl}/${id}`, period);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    activate(id: string): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
    }

    // Academic Term Calendar

    getTerms(periodId: string): Observable<AcademicTerm[]> {
        return this.http.get<AcademicTerm[]>(`${this.apiUrl}/${periodId}/terms`);
    }

    createTerm(periodId: string, term: Partial<AcademicTerm>): Observable<AcademicTerm> {
        return this.http.post<AcademicTerm>(`${this.apiUrl}/${periodId}/terms`, term);
    }

    updateTerm(termId: string, term: Partial<AcademicTerm>): Observable<AcademicTerm> {
        return this.http.put<AcademicTerm>(`${this.apiUrl}/terms/${termId}`, term);
    }

    deleteTerm(termId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/terms/${termId}`);
    }

    activateTerm(periodId: string, termId: string): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${periodId}/terms/${termId}/activate`, {});
    }

    toggleTermLock(termId: string): Observable<{ message: string }> {
        return this.http.patch<{ message: string }>(`${this.apiUrl}/terms/${termId}/lock`, {});
    }
}
