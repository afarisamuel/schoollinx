import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Class {
    id: string;
    name: string;
    teacher_id?: string;
    scholastic_level_id?: string;
    scholastic_level?: { id: string; name: string; ordinal: number };
    subjects?: { id: string; name: string; code: string }[];
}

export interface ClassTermLock {
    id?: string;
    class_id: string;
    term: string;
    is_locked: boolean;
    updated_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ClassService {
    private http = inject(HttpClient);
    private apiUrl = '/api/classes';

    getClasses(): Observable<Class[]> {
        return this.http.get<Class[]>(this.apiUrl);
    }


    createClass(cls: Partial<Class>): Observable<Class> {
        return this.http.post<Class>(this.apiUrl, cls);
    }

    updateClass(id: string, cls: Partial<Class>): Observable<Class> {
        return this.http.put<Class>(`${this.apiUrl}/${id}`, cls);
    }

    deleteClass(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    getClassSubjects(classId: string): Observable<{ id: string; name: string; code: string }[]> {
        return this.http.get<{ id: string; name: string; code: string }[]>(`${this.apiUrl}/${classId}/subjects`);
    }

    setClassSubjects(classId: string, subjectIds: string[]): Observable<any> {
        return this.http.put(`${this.apiUrl}/${classId}/subjects`, { subject_ids: subjectIds });
    }

    getClassLocks(classId: string): Observable<ClassTermLock[]> {
        return this.http.get<ClassTermLock[]>(`${this.apiUrl}/${classId}/locks`);
    }

    upsertClassLock(classId: string, lock: ClassTermLock): Observable<ClassTermLock> {
        return this.http.post<ClassTermLock>(`${this.apiUrl}/${classId}/locks`, lock);
    }

    exportClassRankingPDF(classId: string, term?: string, periodId?: string): Observable<Blob> {
        let params = '';
        const parts: string[] = [];
        if (term) parts.push(`term=${encodeURIComponent(term)}`);
        if (periodId) parts.push(`period_id=${encodeURIComponent(periodId)}`);
        if (parts.length > 0) params = `?${parts.join('&')}`;
        return this.http.get(`${this.apiUrl}/${classId}/ranking/export${params}`, { responseType: 'blob' });
    }
}

