import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    schema_name: string;
    is_active: boolean;
    billing_due_date?: string;
    created_at?: string;
}

export interface OnboardTenantRequest {
    name: string;
    subdomain: string;
    admin_email: string;
    admin_first_name: string;
    admin_last_name: string;
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

@Injectable({ providedIn: 'root' })
export class TenantService {
    private http = inject(HttpClient);
    private tenantUrl = '/api/system/tenants';
    private systemUrl = '/api/system';

    listTenants(): Observable<Tenant[]> {
        return this.http.get<Tenant[]>(this.tenantUrl);
    }

    onboardTenant(req: OnboardTenantRequest): Observable<Tenant> {
        return this.http.post<Tenant>(this.tenantUrl, req);
    }

    updateStatus(id: string, isActive: boolean): Observable<{ message: string }> {
        return this.http.patch<{ message: string }>(`${this.tenantUrl}/${id}/status`, { is_active: isActive });
    }

    resendSetupEmail(id: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.tenantUrl}/${id}/resend-setup`, {});
    }

    updateBilling(id: string, req: { subscription_plan: string, per_student_per_term_rate: number, sms_credits: number, storage_limit_gb: number, billing_due_date?: string | null }): Observable<{ message: string }> {
        return this.http.put<{ message: string }>(`${this.tenantUrl}/${id}/billing`, req);
    }

    impersonate(id: string): Observable<{ token: string, message: string }> {
        return this.http.post<{ token: string, message: string }>(`${this.tenantUrl}/${id}/impersonate`, {});
    }

    resetData(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.tenantUrl}/${id}/reset`);
    }

    exportData(id: string): Observable<Blob> {
        return this.http.get(`${this.tenantUrl}/${id}/export`, { responseType: 'blob' });
    }

    getStats(): Observable<SystemStats> {
        return this.http.get<SystemStats>(`${this.systemUrl}/stats`);
    }

    getGlobalDirectory(): Observable<GlobalUser[]> {
        return this.http.get<GlobalUser[]>(`${this.systemUrl}/directory`);
    }

    // Announcements
    listAnnouncements(): Observable<any[]> {
        return this.http.get<any[]>(`${this.systemUrl}/announcements`);
    }

    createAnnouncement(req: { title: string, content: string, priority: string }): Observable<any> {
        return this.http.post<any>(`${this.systemUrl}/announcements`, req);
    }

    toggleAnnouncement(id: string, is_active: boolean): Observable<any> {
        return this.http.patch<any>(`${this.systemUrl}/announcements/${id}/toggle`, { is_active });
    }

    deleteAnnouncement(id: string): Observable<any> {
        return this.http.delete<any>(`${this.systemUrl}/announcements/${id}`);
    }
}
