import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReportCardTemplate {
  id?: string;
  name: string;
  description?: string;
  layout_json: any;
  is_active?: boolean;
}

export interface ReportCard {
  id?: string;
  student_id: string;
  academic_period_id: string;
  template_id: string;
  status?: 'DRAFT' | 'GENERATED' | 'PUBLISHED';
  rendered_data?: any;
  pdf_url?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportCardService {
  private baseUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  createTemplate(template: ReportCardTemplate): Observable<ReportCardTemplate> {
    return this.http.post<ReportCardTemplate>(`${this.baseUrl}/templates`, template);
  }

  getTemplates(): Observable<ReportCardTemplate[]> {
    return this.http.get<ReportCardTemplate[]>(`${this.baseUrl}/templates`);
  }

  generateReport(report: ReportCard): Observable<ReportCard> {
    return this.http.post<ReportCard>(`${this.baseUrl}/generate`, report);
  }

  getStudentReports(studentId: string): Observable<ReportCard[]> {
    return this.http.get<ReportCard[]>(`${this.baseUrl}/students/${studentId}`);
  }

  publishReport(reportId: string, pdfUrl: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${reportId}/publish`, { pdf_url: pdfUrl });
  }
}
