import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SenderIDRequest {
  id: string;
  tenant_id: string;
  sender_id: string;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  reviewed_at?: string;
  created_at: string;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    sms_credits: number;
    sms_sender_id?: string;
  };
}

export interface SMSPricingData {
  global_cost_per_sms: number;
  currency: string;
  tenants: Array<{
    id: string;
    name: string;
    subdomain: string;
    sms_credits: number;
    sms_sender_id: string;
    sms_sender_id_status: string;
    sms_cost_per_unit: number;
  }>;
}

export interface SMSTelemetry {
  total_credits_in_circulation: number;
  pending_sender_id_requests: number;
  active_approved_sender_ids: number;
  total_topup_revenue_ghs: number;
  global_cost_per_sms: number;
}

export interface SmsLedgerItem {
  id: string;
  tenant_id: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  created_at: string;
  tenant?: {
    name: string;
    subdomain: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SmsAdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system/sms`;

  getRequests(status?: string): Observable<SenderIDRequest[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<SenderIDRequest[]>(`${this.apiUrl}/requests`, { params });
  }

  approveSenderID(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/approve`, {});
  }

  rejectSenderID(id: string, adminNotes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${id}/reject`, { admin_notes: adminNotes });
  }

  getPricing(): Observable<SMSPricingData> {
    return this.http.get<SMSPricingData>(`${this.apiUrl}/pricing`);
  }

  updateGlobalPricing(rate: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/pricing`, { global_rate: rate });
  }

  setTenantRate(tenantId: string, rate: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants/${tenantId}/rate`, { rate });
  }

  injectCredits(tenantId: string, amount: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants/${tenantId}/credits`, { amount, reason });
  }

  getTelemetry(): Observable<SMSTelemetry> {
    return this.http.get<SMSTelemetry>(`${this.apiUrl}/telemetry`);
  }

  getLedger(): Observable<SmsLedgerItem[]> {
    return this.http.get<SmsLedgerItem[]>(`${this.apiUrl}/ledger`);
  }
}
