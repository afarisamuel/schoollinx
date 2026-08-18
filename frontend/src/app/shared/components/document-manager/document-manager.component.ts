import { Component, Input, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/infrastructure/document/document.service';
import { Document, DocumentCategory } from '../../../core/domain/document.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-document-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './document-manager.component.html',
    styleUrl: './document-manager.component.css'
})
export class DocumentManagerComponent implements OnInit {
    @Input() ownerId!: string;
    @Input() ownerType: 'STUDENT' | 'STAFF' = 'STUDENT';

    private docService = inject(DocumentService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    documents = signal<Document[]>([]);
    isUploading = signal(false);
    isLoading = signal(false);
    errorMsg = signal('');
    successMsg = signal('');

    selectedCategory = signal<DocumentCategory>('ACADEMIC');
    selectedDescription = signal('');

    categories: { value: DocumentCategory; label: string }[] = [
        { value: 'ACADEMIC', label: '🎓 Academic' },
        { value: 'MEDICAL', label: '🏥 Medical' },
        { value: 'LEGAL', label: '⚖️ Legal' },
        { value: 'IDENTITY', label: '🪪 Identity' },
        { value: 'DISCIPLINARY', label: '📋 Disciplinary' },
        { value: 'OTHER', label: '📎 Other' },
    ];

    ngOnInit() {
        if (isPlatformBrowser(this.platformId) && this.ownerId) {
            this.loadDocuments();
        }
    }

    loadDocuments() {
        this.isLoading.set(true);
        this.docService.getByOwner(this.ownerId).subscribe({
            next: docs => { this.documents.set(docs); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.upload(file);
        input.value = '';
    }

    upload(file: File) {
        this.isUploading.set(true);
        this.errorMsg.set('');
        this.docService.upload(file, {
            owner_id: this.ownerId,
            owner_type: this.ownerType,
            category: this.selectedCategory(),
            description: this.selectedDescription() || undefined
        }).subscribe({
            next: () => {
                this.successMsg.set('Document uploaded successfully!');
                this.selectedDescription.set('');
                this.loadDocuments();
                this.isUploading.set(false);
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: e => {
                this.errorMsg.set(e.error?.error || 'Upload failed. Check file type & size (max 10MB).');
                this.isUploading.set(false);
            }
        });
    }

    download(doc: Document) {
        this.docService.download(doc.id).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = doc.title; a.click();
            URL.revokeObjectURL(url);
        });
    }

    delete(doc: Document) {
        this.dialog.confirm(`Delete "${doc.title}"?`, 'Delete Document', 'danger', 'Delete')
            .subscribe((confirmed: boolean) => {
                if (!confirmed) return;
                this.docService.delete(doc.id).subscribe(() => this.loadDocuments());
            });
    }

    fileIcon(mime: string): string {
        if (mime.includes('pdf')) return '📄';
        if (mime.includes('image')) return '🖼️';
        if (mime.includes('word') || mime.includes('document')) return '📝';
        if (mime.includes('sheet') || mime.includes('excel')) return '📊';
        if (mime.includes('csv')) return '📋';
        return '📎';
    }

    formatSize(bytes?: number): string {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}
