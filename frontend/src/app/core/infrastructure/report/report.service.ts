import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DocumentType = 'TRANSCRIPT' | 'ENROLLMENT_CERTIFICATE' | 'CONDUCT_REPORT';

export interface TranscriptVerificationResult {
    valid: boolean;
    verification_hash?: string;
    status?: string;
    overall_score?: number;
    attendance_rate?: number;
    generated_at?: string;
    message?: string;
}

export interface CompetencyEvaluationItem {
    id: string;
    rubric_id: string;
    score: number;
    teacher_note?: string;
    rubric?: {
        name: string;
        domain: string;
        description?: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private http = inject(HttpClient);
    private apiUrl = '/api/reports';

    downloadDocument(studentId: string, type: DocumentType): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/students/${studentId}/document`, {
            params: { type },
            responseType: 'blob'
        });
    }

    downloadTranscript(studentId: string): Observable<Blob> {
        return this.downloadDocument(studentId, 'TRANSCRIPT');
    }

    saveFile(blob: Blob, filename: string) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    // Milestone 1: Verifiable Transcripts & Hash Verification
    verifyTranscript(hash: string): Observable<TranscriptVerificationResult> {
        return this.http.get<TranscriptVerificationResult>(`${this.apiUrl}/verify/${hash}`);
    }

    // Milestone 1: Competencies (CBE / NaCCA)
    getCompetencyEvaluations(studentId: string, periodId?: string): Observable<CompetencyEvaluationItem[]> {
        const url = periodId 
            ? `${this.apiUrl}/competencies/students/${studentId}?period_id=${periodId}`
            : `${this.apiUrl}/competencies/students/${studentId}`;
        return this.http.get<CompetencyEvaluationItem[]>(url);
    }

    // Milestone 1: AI Report Card Remarks
    generateAIRemarks(payload: {
        student_name: string;
        gpa: number;
        attendance_pct: number;
        top_subject?: string;
        low_subject?: string;
    }): Observable<{ remarks: string }> {
        return this.http.post<{ remarks: string }>(`${this.apiUrl}/ai-remarks`, payload);
    }

    // Terminal Report Card Operations
    downloadStudentTerminalReport(studentId: string, periodId?: string, termId?: string): Observable<Blob> {
        let params: any = {};
        if (periodId) params.period_id = periodId;
        if (termId) params.term_id = termId;
        return this.http.get(`${this.apiUrl}/students/${studentId}/terminal`, {
            params,
            responseType: 'blob'
        });
    }

    downloadBatchClassTerminalReports(classId: string, periodId?: string, termId?: string): Observable<Blob> {
        let params: any = {};
        if (periodId) params.period_id = periodId;
        if (termId) params.term_id = termId;
        return this.http.get(`${this.apiUrl}/classes/${classId}/terminal/batch`, {
            params,
            responseType: 'blob'
        });
    }
}
