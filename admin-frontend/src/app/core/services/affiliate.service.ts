import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string;
  commission_rate: number;
  is_active: boolean;
  notes: string;
  referrals: number;
  total_earned: number;
  created_at: string;
}

export interface AffiliateReferral {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_subdomain: string;
  tenant_plan: string;
  commission_paid: number;
  paid_at: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AffiliateService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system/affiliates`;

  getAffiliates(): Observable<Affiliate[]> {
    return this.http.get<Affiliate[]>(this.apiUrl);
  }

  createAffiliate(data: any): Observable<Affiliate> {
    return this.http.post<Affiliate>(this.apiUrl, data);
  }

  updateAffiliate(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  toggleAffiliate(id: string, is_active: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, { is_active });
  }

  deleteAffiliate(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getReferrals(affiliateId: string): Observable<AffiliateReferral[]> {
    return this.http.get<AffiliateReferral[]>(`${this.apiUrl}/${affiliateId}/referrals`);
  }

  addReferral(affiliateId: string, tenantId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${affiliateId}/referrals`, { tenant_id: tenantId });
  }

  markReferralPaid(referralId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/referrals/${referralId}/pay`, {});
  }
}
