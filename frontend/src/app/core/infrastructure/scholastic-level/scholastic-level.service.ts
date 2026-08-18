import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScholasticLevel } from '../../domain/scholastic-level.model';

@Injectable({
    providedIn: 'root'
})
export class ScholasticLevelService {
    private http = inject(HttpClient);
    private apiUrl = '/api/scholastic-levels';

    getAll(): Observable<ScholasticLevel[]> {
        return this.http.get<ScholasticLevel[]>(this.apiUrl);
    }

    getById(id: string): Observable<ScholasticLevel> {
        return this.http.get<ScholasticLevel>(`${this.apiUrl}/${id}`);
    }

    create(level: Partial<ScholasticLevel>): Observable<ScholasticLevel> {
        return this.http.post<ScholasticLevel>(this.apiUrl, level);
    }

    update(id: string, level: Partial<ScholasticLevel>): Observable<ScholasticLevel> {
        return this.http.put<ScholasticLevel>(`${this.apiUrl}/${id}`, level);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
