import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DocumentType = 'TRANSCRIPT' | 'ENROLLMENT_CERTIFICATE' | 'CONDUCT_REPORT';

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
}
