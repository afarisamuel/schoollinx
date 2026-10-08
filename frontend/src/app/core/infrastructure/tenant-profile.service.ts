import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { map } from 'rxjs/operators';

export interface TenantProfile {
  id: string;
  name: string;
  subdomain: string;
  is_active: boolean;
  subscription_plan: string;
  per_student_rate: number;
  per_student_per_term_rate: number;
  sms_credits: number;
  storage_limit_gb: number;
  storage_used_mb?: number;
  billing_due_date?: string;
  logo_url?: string;
  headmaster_signature_url?: string;
  address?: string;
  contact_numbers?: string;
  email?: string;
  website?: string;
  paystack_public_key?: string;
  paystack_secret_key?: string; // Only sent during update
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
  category: string;
  icon: string;
  count: number;
}

export interface SetupProgressResponse {
  overall_progress: number;
  is_complete: boolean;
  completed_steps: number;
  total_steps: number;
  steps: SetupStep[];
}

@Injectable({
  providedIn: 'root'
})
export class TenantProfileService {
  private http = inject(HttpClient);

  private sanitizeUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://api.schoollinx.com')) {
      return url.replace('http://api.schoollinx.com', 'https://api.schoollinx.com');
    }
    if (url.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return url.replace(/^http:\/\//, 'https://');
    }
    return url;
  }

  private sanitizeProfile(profile: TenantProfile): TenantProfile {
    if (!profile) return profile;
    return {
      ...profile,
      logo_url: this.sanitizeUrl(profile.logo_url),
      headmaster_signature_url: this.sanitizeUrl(profile.headmaster_signature_url)
    };
  }

  getProfile(): Observable<TenantProfile> {
    return this.http.get<TenantProfile>('/api/tenant/profile').pipe(
      map(p => this.sanitizeProfile(p))
    );
  }

  getSetupProgress(): Observable<SetupProgressResponse> {
    return this.http.get<SetupProgressResponse>('/api/tenant/setup-progress');
  }

  /** No auth required — safe to call from public-facing pages. */
  getPublicInfo(): Observable<{ name: string; subdomain: string; logo_url: string; website?: string }> {
    return this.http.get<{ name: string; subdomain: string; logo_url: string; website?: string }>('/api/public/tenant-info').pipe(
      map(info => ({
        ...info,
        logo_url: this.sanitizeUrl(info.logo_url)
      }))
    );
  }


  updateProfile(profile: Partial<TenantProfile>): Observable<TenantProfile> {
    return this.http.put<TenantProfile>('/api/tenant/profile', profile);
  }

  uploadLogo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ url: string }>('/api/tenant/profile/logo', formData);
  }

  uploadHeadmasterSignature(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('signature', file);
    return this.http.post<{ url: string }>('/api/tenant/profile/headmaster-signature', formData);
  }

  updatePaymentConfig(publicKey: string, secretKey: string, provider: 'PAYSTACK'): Observable<any> {
    return this.http.put(`${environment.apiUrl}/tenant/payment-config`, {
      paystack_public_key: publicKey,
      paystack_secret_key: secretKey
    });
  }

  getPaystackCountries(): Observable<PaystackCountry[]> {
    return this.http.get<PaystackCountry[]>('/api/tenant/paystack/countries');
  }

  getPaystackBanks(country: string = 'ghana'): Observable<PaystackBank[]> {
    return this.http.get<PaystackBank[]>(`/api/tenant/paystack/banks?country=${encodeURIComponent(country)}`);
  }

  resolvePaystackAccount(accountNumber: string, bankCode: string): Observable<PaystackResolvedAccount> {
    return this.http.post<PaystackResolvedAccount>('/api/tenant/paystack/resolve-account', {
      account_number: accountNumber,
      bank_code: bankCode
    });
  }

  createPaystackSubaccount(data: {
    country: string;
    business_name: string;
    settlement_bank: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    percentage_charge?: number;
  }): Observable<any> {
    return this.http.post('/api/tenant/paystack/subaccount', data);
  }

  getPaystackSubaccount(): Observable<TenantSubaccountConfig> {
    return this.http.get<TenantSubaccountConfig>('/api/tenant/paystack/subaccount');
  }

  removePaystackSubaccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>('/api/tenant/paystack/subaccount');
  }

  getSubscriptionHistory(): Observable<TenantSubscriptionPayment[]> {
    return this.http.get<TenantSubscriptionPayment[]>('/api/tenant/subscription/history');
  }

  getSubscriptionSummary(): Observable<TenantSubscriptionSummary> {
    return this.http.get<TenantSubscriptionSummary>('/api/tenant/subscription/summary');
  }

  getActiveAnnouncements(): Observable<SystemAnnouncement[]> {
    return this.http.get<SystemAnnouncement[]>('/api/public/announcements');
  }
}

export interface TenantSubscriptionSummary {
  total_students: number;
  paid_student_count: number;
  unpaid_student_count: number;
  per_student_rate: number;
  total_due: number;
  total_term_cost: number;
  billing_due_date?: string;
  status: 'ACTIVE' | 'PARTIAL' | 'OVERDUE' | 'PENDING';
  is_fully_covered: boolean;
  latest_payment?: TenantSubscriptionPayment;
}

export interface PaystackCountry {
  name: string;
  code: string;
  currency: string;
  currency_sign: string;
}

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway?: string;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
  bank_id?: number;
}

export interface TenantSubaccountConfig {
  has_subaccount: boolean;
  subaccount_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  has_custom_keys: boolean;
  paystack_public_key: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export interface TenantSubscriptionPayment {
  id: string;
  tenant_id: string;
  amount: number;
  student_count: number;
  reference: string;
  status: string;
  provider: string;
  payer_email: string;
  created_at: string;
  updated_at: string;
}
