import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from '../../domain/pagination.model';

export interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_DELETE';
    entity_type: string;
    entity_id: string;
    changes: string;
    ip_address: string;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuditService {
    private http = inject(HttpClient);
    private apiUrl = `${(environment as any).apiUrl}/audit-logs`;

    getLogsPaginated(page: number = 1, limit: number = 50): Observable<PaginatedResponse<AuditLog>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());
        return this.http.get<PaginatedResponse<AuditLog>>(this.apiUrl, { params });
    }

    getLogs(): Observable<AuditLog[]> {
        return this.getLogsPaginated(1, 1000).pipe(map(res => res.data || []));
    }
}
