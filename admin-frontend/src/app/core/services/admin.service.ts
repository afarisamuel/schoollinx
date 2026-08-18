import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  actor_email: string;
  metadata: any;
  created_at: string;
}

export interface SystemStats {
  totalTenants: number;
  totalUsers: number;
  activeSessions: number;
  systemHealth: string;
}

export interface GlobalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  subdomain: string;
  status: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system`;

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs`);
  }

  getSecurityIPs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security/ips`);
  }

  addSecurityIP(ip: string, description: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/ips`, { ip_address: ip, description });
  }

  deleteSecurityIP(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security/ips/${id}`);
  }

  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/stats`);
  }

  getGlobalDirectory(): Observable<GlobalUser[]> {
    return this.http.get<GlobalUser[]>(`${this.apiUrl}/directory`);
  }
}
