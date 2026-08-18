import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Document, DocumentCategory } from '../../domain/document.model';

export interface UploadDocumentPayload {
    owner_id: string;
    owner_type: 'STUDENT' | 'STAFF';
    category: DocumentCategory;
    description?: string;
}

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    private http = inject(HttpClient);
    private apiUrl = '/api/documents';

    upload(file: File, payload: UploadDocumentPayload): Observable<Document> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('owner_id', payload.owner_id);
        formData.append('owner_type', payload.owner_type);
        formData.append('category', payload.category);
        if (payload.description) {
            formData.append('description', payload.description);
        }
        return this.http.post<Document>(`${this.apiUrl}/upload`, formData);
    }

    getByOwner(ownerId: string): Observable<Document[]> {
        return this.http.get<Document[]>(`${this.apiUrl}/owner/${ownerId}`);
    }

    download(id: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
    }

    delete(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }
}
