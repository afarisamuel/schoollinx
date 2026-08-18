export type DocumentCategory = 'MEDICAL' | 'ACADEMIC' | 'LEGAL' | 'IDENTITY' | 'DISCIPLINARY' | 'OTHER';

export interface Document {
    id: string;
    owner_id: string;
    owner_type: 'STUDENT' | 'STAFF';
    category: DocumentCategory;
    title: string;
    description?: string;
    file_mime_type: string;
    file_size?: number;
    storage_path?: string;
    uploaded_by: string;
    uploaded_at: string;
}
