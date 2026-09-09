import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  version: string;
  is_published: boolean;
  effective_date?: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalPageUpsertDto {
  slug: string;
  title: string;
  category?: string;
  summary?: string;
  content: string;
  version?: string;
  is_published?: boolean;
  effective_date?: string;
  last_updated_by?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LegalPagesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system/legal-pages`;

  getLegalPages(category?: string, query?: string): Observable<LegalPage[]> {
    let params: Record<string, string> = {};
    if (category && category !== 'ALL') params['category'] = category;
    if (query) params['q'] = query;
    return this.http.get<LegalPage[]>(this.apiUrl, { params });
  }

  getLegalPage(idOrSlug: string): Observable<LegalPage> {
    return this.http.get<LegalPage>(`${this.apiUrl}/${idOrSlug}`);
  }

  createLegalPage(page: LegalPageUpsertDto): Observable<LegalPage> {
    return this.http.post<LegalPage>(this.apiUrl, page);
  }

  updateLegalPage(id: string, page: Partial<LegalPageUpsertDto>): Observable<LegalPage> {
    return this.http.put<LegalPage>(`${this.apiUrl}/${id}`, page);
  }

  togglePublish(id: string): Observable<{ id: string; is_published: boolean }> {
    return this.http.patch<{ id: string; is_published: boolean }>(`${this.apiUrl}/${id}/toggle`, {});
  }

  deleteLegalPage(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
