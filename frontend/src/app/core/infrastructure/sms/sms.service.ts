import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SMSOverview {
  sms_credits: number;
  sms_sender_id: string;
  sms_sender_id_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  cost_per_sms: number;
  latest_request?: {
    id: string;
    sender_id: string;
    purpose: string;
    status: string;
    admin_notes?: string;
    created_at: string;
  };
  recent_topups: Array<{
    id: string;
    amount: number;
    credits_purchased: number;
    reference: string;
    status: string;
    created_at: string;
  }>;
  recent_ledger: Array<{
    id: string;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    created_at: string;
  }>;
}

export interface SMSPricing {
  cost_per_sms: number;
  currency: string;
  sample_bundles: Array<{
    amount: number;
    credits: number;
    label: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class SmsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/sms';

  getOverview(): Observable<SMSOverview> {
    return this.http.get<SMSOverview>(`${this.apiUrl}/overview`);
  }

  requestSenderID(senderId: string, purpose: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sender-id/request`, {
      sender_id: senderId,
      purpose
    });
  }

  getSenderIDStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sender-id/status`);
  }

  getPricing(): Observable<SMSPricing> {
    return this.http.get<SMSPricing>(`${this.apiUrl}/pricing`);
  }

  initializeTopUp(amount: number, payerEmail?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/topup/initialize`, {
      amount,
      payer_email: payerEmail
    });
  }

  verifyTopUp(reference: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/topup/verify/${reference}`, {});
  }

  getTopUpHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/topup/history`);
  }
}
