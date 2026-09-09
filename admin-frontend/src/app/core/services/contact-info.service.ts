import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompanyContactInfo {
  id?: number;
  sales_email: string;
  sales_title: string;
  sales_desc: string;
  support_email: string;
  support_title: string;
  support_desc: string;
  general_email: string;
  dpo_email: string;
  primary_phone: string;
  phone_title: string;
  operating_hours: string;
  whatsapp_number: string;
  emergency_hotline: string;
  headquarters_title: string;
  headquarters_subtitle: string;
  headquarters_address: string;
  full_address: string;
  twitter_url: string;
  linkedin_url: string;
  github_url: string;
  youtube_url: string;
  facebook_url: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactInfoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system/contact-info`;

  getContactInfo(): Observable<CompanyContactInfo> {
    return this.http.get<CompanyContactInfo>(this.apiUrl);
  }

  updateContactInfo(info: CompanyContactInfo): Observable<CompanyContactInfo> {
    return this.http.put<CompanyContactInfo>(this.apiUrl, info);
  }
}
