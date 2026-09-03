import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OnboardTenantRequest {
  name: string;
  subdomain: string;
  admin_email: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  contact_email: string;
  is_active: boolean;
  subscription_plan: string;
  per_student_per_term_rate: number;
  per_student_rate: number;
  student_count: number;
  sms_credits: number;
  storage_limit_gb: number;
  storage_used_mb: number;
  discount_percentage?: number;
  fixed_price_override?: number;
  require_2fa?: boolean;
  dpa_signed_at?: string;
  billing_due_date?: string;
  trial_ends_at?: string;
  paystack_public_key?: string;
  paystack_subaccount_code?: string;
  created_at: string;
}

export interface SubscriptionPayment {
  id: string;
  tenant_id: string;
  amount: number;
  student_count: number;
  reference: string;
  status: string;
  provider: string;
  payer_email: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/system/tenants`;
  private systemUrl = `${environment.apiUrl}/system`;

  onboardTenant(req: OnboardTenantRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, req);
  }

  getTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(this.apiUrl);
  }

  updateTenantConfig(id: string, config: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/config`, config);
  }

  // Security Endpoints
  forcePasswordReset(tenantId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tenantId}/reset-passwords`, {});
  }

  toggle2FA(tenantId: string, require: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tenantId}/2fa`, { require });
  }

  // Financials Endpoints
  updateStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { is_active: isActive });
  }

  resendSetupEmail(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/resend-setup`, {});
  }

  addTenantAdmin(tenantId: string, adminData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${tenantId}/admins`, adminData);
  }

  updateBilling(tenantId: string, billingData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${tenantId}/billing`, billingData);
  }

  impersonate(id: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/${id}/impersonate`, {});
  }

  resetData(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/reset`);
  }

  exportData(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/export`, { responseType: 'blob' });
  }

  injectCredits(id: string, amount: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/credits`, { amount, reason });
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.systemUrl}/stats`);
  }

  getMRR(): Observable<any> {
    return this.http.get<any>(`${this.systemUrl}/finance/mrr`);
  }

  getChurnRisk(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/finance/churn-risk`);
  }

  getFinanceOverview(): Observable<any> {
    return this.http.get<any>(`${this.systemUrl}/finance/overview`);
  }

  getRevenueByPlan(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/finance/revenue-by-plan`);
  }

  getTenantHealth(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/finance/tenant-health`);
  }

  getGlobalDirectory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/directory`);
  }

  // Telemetry Endpoints
  getTelemetryActiveUsers(): Observable<any[]> {
    return this.http.get<any[]>(`/api/telemetry/admin/active-users`);
  }

  getTelemetryModuleUsage(): Observable<any[]> {
    return this.http.get<any[]>(`/api/telemetry/admin/module-usage`);
  }

  getTelemetryFunnel(): Observable<any[]> {
    return this.http.get<any[]>(`/api/telemetry/admin/funnel`);
  }

  getTelemetryErrors(): Observable<any[]> {
    return this.http.get<any[]>(`/api/telemetry/admin/errors`);
  }

  listAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/announcements`);
  }

  createAnnouncement(req: { title: string, content: string, priority: string }): Observable<any> {
    return this.http.post<any>(`${this.systemUrl}/announcements`, req);
  }

  updateAnnouncement(id: string, req: { title: string, content: string, priority: string }): Observable<any> {
    return this.http.put<any>(`${this.systemUrl}/announcements/${id}`, req);
  }

  toggleAnnouncement(id: string, is_active: boolean): Observable<any> {
    return this.http.patch<any>(`${this.systemUrl}/announcements/${id}/toggle`, { is_active });
  }

  deleteAnnouncement(id: string): Observable<any> {
    return this.http.delete<any>(`${this.systemUrl}/announcements/${id}`);
  }

  // Contact Form Submissions
  getContactSubmissions(status?: string): Observable<any[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any[]>(`${this.systemUrl}/contacts${params}`);
  }

  updateContactStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.systemUrl}/contacts/${id}/status`, { status });
  }

  getSubscriptionHistory(tenantId: string): Observable<SubscriptionPayment[]> {
    return this.http.get<SubscriptionPayment[]>(`${this.apiUrl}/${tenantId}/subscription-history`);
  }

  updatePaymentConfig(tenantId: string, config: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${tenantId}/payment-config`, config);
  }

  // Phase 1-5 additions
  getBillingAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/finance/billing-alerts`);
  }

  getStorageUsage(): Observable<any> {
    return this.http.get<any>(`${this.systemUrl}/finance/storage-usage`);
  }

  getFeatureFlags(tenantId: string): Observable<{ tenant_id: string, feature_flags: Record<string, boolean> }> {
    return this.http.get<{ tenant_id: string, feature_flags: Record<string, boolean> }>(`${this.apiUrl}/${tenantId}/feature-flags`);
  }

  updateFeatureFlags(tenantId: string, flags: Record<string, boolean>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${tenantId}/feature-flags`, { flags });
  }

  getTenantNotes(tenantId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${tenantId}/notes`);
  }

  addTenantNote(tenantId: string, note: { category?: string, content: string, author?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tenantId}/notes`, note);
  }

  getOnboardingStatus(tenantId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${tenantId}/onboarding-status`);
  }

  getSupportTickets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/tickets`);
  }

  updateTicketStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.systemUrl}/tickets/${id}`, { status });
  }

  // Subscription Plans
  getSubscriptionPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/plans`);
  }

  saveSubscriptionPlans(plans: any[]): Observable<any> {
    return this.http.put<any>(`${this.systemUrl}/plans`, plans);
  }

  sendAdminEmailBroadcast(payload: { subject: string; body: string; target_audience?: string; target_plan?: string }): Observable<any> {
    return this.http.post<any>(`${this.systemUrl}/broadcasts/email`, payload);
  }

  // Cross-Tenant Impersonation
  impersonateUser(userId: string, subdomain: string): Observable<any> {
    return this.http.post<any>(`${this.systemUrl}/impersonate/${userId}?subdomain=${subdomain}`, {});
  }

  // Scheduled Jobs
  getScheduledJobs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/jobs`);
  }

  runScheduledJob(jobId: string): Observable<any> {
    return this.http.post<any>(`${this.systemUrl}/jobs/${jobId}/run`, {});
  }

  // Carrier Gateway Failover
  getCarrierConfigs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.systemUrl}/sms/carriers`);
  }

  saveCarrierConfigs(carriers: any[]): Observable<any> {
    return this.http.put<any>(`${this.systemUrl}/sms/carriers`, carriers);
  }

  // Bulk Institutional Onboarding
  bulkImportTenants(manifest: any[]): Observable<any> {
    return this.http.post<any>(`${this.systemUrl}/tenants/bulk-import`, manifest);
  }
}
