import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Student } from '../../../core/domain/student.model';
import { ReportService, DocumentType } from '../../../core/infrastructure/report/report.service';

import { DocumentManagerComponent } from '../document-manager/document-manager.component';
import { signal } from '@angular/core';

@Component({
    selector: 'app-document-request-modal',
    standalone: true,
    imports: [CommonModule, DocumentManagerComponent],
    templateUrl: './document-request-modal.component.html',
    styleUrl: './document-request-modal.component.css'
})
export class DocumentRequestModalComponent {
    activeTab = signal<'reports' | 'vault'>('reports');
    @Input() student: Student | null = null;
    @Output() close = new EventEmitter<void>();

    private reportService = inject(ReportService);

    options = [
        { type: 'TRANSCRIPT' as DocumentType, title: 'Academic Transcript', icon: '📝', description: 'Complete history of grades and attendance.' },
        { type: 'ENROLLMENT_CERTIFICATE' as DocumentType, title: 'Enrollment Certificate', icon: '🎓', description: 'Official proof of current registration.' },
        { type: 'CONDUCT_REPORT' as DocumentType, title: 'Conduct & Behavior', icon: '🛡️', description: 'Summary of attendance and behavioral standing.' }
    ];

    generate(type: DocumentType) {
        if (!this.student) return;

        this.reportService.downloadDocument(this.student.id!, type).subscribe({
            next: (blob) => {
                const filename = `${type.toLowerCase()}_${this.student?.id}.pdf`;
                this.reportService.saveFile(blob, filename);
                this.close.emit();
            }
        });
    }
}
