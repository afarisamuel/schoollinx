import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
    id?: string;
    subject: string;
    body_html: string;
    target: string;
    status?: string;
    created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
    private http = inject(HttpClient);
    private api = '/api/campaigns';

    getAll(): Observable<Campaign[]> {
        return this.http.get<Campaign[]>(this.api);
    }

    create(campaign: Campaign): Observable<Campaign> {
        return this.http.post<Campaign>(this.api, campaign);
    }

    delete(id: string): Observable<any> {
        return this.http.delete(`${this.api}/${id}`);
    }

    dispatch(id: string): Observable<any> {
        return this.http.post(`${this.api}/${id}/dispatch`, {});
    }
}
