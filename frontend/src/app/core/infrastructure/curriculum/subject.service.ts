import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Subject {
    id: string;
    name: string;
    code: string;
}

@Injectable({
    providedIn: 'root'
})
export class SubjectService {
    private http = inject(HttpClient);
    private apiUrl = '/api/subjects';

    getSubjects(): Observable<Subject[]> {
        return this.http.get<Subject[]>(this.apiUrl);
    }

    getSubject(id: string): Observable<Subject> {
        return this.http.get<Subject>(`${this.apiUrl}/${id}`);
    }

    createSubject(subject: Partial<Subject>): Observable<Subject> {
        return this.http.post<Subject>(this.apiUrl, subject);
    }

    deleteSubject(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
