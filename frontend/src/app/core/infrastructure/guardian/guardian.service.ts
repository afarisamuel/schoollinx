import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Student, Guardian, AbsenceRequest, FamilyLedgerSummary, PickupPass } from '../../domain/student.model';
import { AcademicInsight } from '../insights/insights.service';

@Injectable({
    providedIn: 'root'
})
export class GuardianService {
    private http = inject(HttpClient);
    private parentApiUrl = '/api/guardian';
    private adminApiUrl = '/api/guardians';

    // === Parent Portal endpoints ===
    getProfile(): Observable<Guardian> {
        return this.http.get<Guardian>(`${this.parentApiUrl}/profile`).pipe(
            catchError(() => this.http.get<Guardian>(`${this.adminApiUrl}/profile`))
        );
    }

    getChildren(): Observable<Student[]> {
        return this.http.get<Student[]>(`${this.parentApiUrl}/children`);
    }

    getChildAcademics(studentId: string): Observable<AcademicInsight[]> {
        return this.http.get<AcademicInsight[]>(`${this.parentApiUrl}/child/${studentId}/academics`);
    }

    getChildAttendance(studentId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/attendance/student/${studentId}`);
    }

    getStudentWallet(studentId: string): Observable<{ balance: number; transactions: any[] }> {
        return this.http.get<{ balance: number; transactions: any[] }>(`/api/fiscal/wallet/${studentId}`);
    }

    getMyFamilyLedger(): Observable<FamilyLedgerSummary> {
        return this.http.get<FamilyLedgerSummary>(`${this.parentApiUrl}/family-ledger`);
    }

    getMyPickupPass(): Observable<PickupPass> {
        return this.http.get<PickupPass>(`${this.parentApiUrl}/pickup-pass`);
    }

    getMyAbsenceRequests(): Observable<AbsenceRequest[]> {
        return this.http.get<AbsenceRequest[]>(`${this.parentApiUrl}/absence-requests`);
    }

    submitAbsenceRequest(req: Partial<AbsenceRequest>): Observable<AbsenceRequest> {
        return this.http.post<AbsenceRequest>(`${this.parentApiUrl}/absence-requests`, req);
    }

    // === Admin/Teacher endpoints ===
    getAll(): Observable<Guardian[]> {
        return this.http.get<Guardian[]>(this.adminApiUrl);
    }

    getById(id: string): Observable<Guardian> {
        return this.http.get<Guardian>(`${this.adminApiUrl}/${id}`);
    }

    getFamilyLedger(id: string): Observable<FamilyLedgerSummary> {
        return this.http.get<FamilyLedgerSummary>(`${this.adminApiUrl}/${id}/family-ledger`);
    }

    createGuardian(guardian: Partial<Guardian>): Observable<{ guardian: Guardian; temp_password?: string }> {
        return this.http.post<{ guardian: Guardian; temp_password?: string }>(this.adminApiUrl, guardian);
    }

    updateGuardian(id: string, guardian: Partial<Guardian>): Observable<Guardian> {
        return this.http.put<Guardian>(`${this.adminApiUrl}/${id}`, guardian);
    }

    deleteGuardian(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.adminApiUrl}/${id}`);
    }

    linkStudent(guardianId: string, studentId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.adminApiUrl}/${guardianId}/students`, { student_id: studentId });
    }

    unlinkStudent(guardianId: string, studentId: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.adminApiUrl}/${guardianId}/students/${studentId}`);
    }

    resetPassword(id: string): Observable<{ message: string; password: string }> {
        return this.http.post<{ message: string; password: string }>(`${this.adminApiUrl}/${id}/reset-password`, {});
    }

    // Absence Management (Admin/Teacher)
    getAllAbsenceRequests(): Observable<AbsenceRequest[]> {
        return this.http.get<AbsenceRequest[]>(`${this.adminApiUrl}/absence-requests`);
    }

    reviewAbsenceRequest(id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.adminApiUrl}/absence-requests/${id}/review`, { status, notes });
    }

    // Campus Pickup Verification
    verifyPickupCode(code: string): Observable<any> {
        return this.http.get<any>(`${this.adminApiUrl}/verify-pickup/${code}`);
    }

    // Bulk Ingestion & Onboarding Campaign
    importGuardians(file: File): Observable<{ message: string; imported: number; skipped: number }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ message: string; imported: number; skipped: number }>(`${this.adminApiUrl}/import`, formData);
    }

    downloadImportTemplate(): Observable<Blob> {
        return this.http.get(`${this.adminApiUrl}/import/template`, { responseType: 'blob' });
    }

    sendPortalInvites(): Observable<{ message: string; count: number }> {
        return this.http.post<{ message: string; count: number }>(`${this.adminApiUrl}/send-invites`, {});
    }
}
