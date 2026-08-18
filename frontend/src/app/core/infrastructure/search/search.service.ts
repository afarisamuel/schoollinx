import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';


export interface SearchResult {
    type: 'student' | 'teacher' | 'class' | 'page';
    id: string;
    title: string;
    path: string;
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private http = inject(HttpClient);
    private apiUrl = `${(environment as any).apiUrl}/search`;

    search(query: string): Observable<SearchResult[]> {
        if (!query.trim()) {
            return of([]);
        }
        return this.http.get<SearchResult[]>(`${this.apiUrl}?q=${query}`).pipe(
            catchError(() => of([]))
        );
    }
}
