import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-absence',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule],
    templateUrl: './parent-absence.page.html'
})
export class ParentAbsencePage implements OnInit {
    state = inject(ParentStateService);
    private api = inject(ParentPortalService);
    private toast = inject(ToastService);

    activeTab = signal<'submit' | 'history'>('submit');
    studentId = signal('');
    startDate = signal('');
    endDate = signal('');
    reason = signal('Medical');
    notes = signal('');
    medicalNoteFile = signal<string | null>(null);
    submitting = signal(false);
    success = signal(false);
    errorMsg = signal('');

    onFileSelected(event: any) {
        const file = event.target?.files?.[0];
        if (file) {
            this.medicalNoteFile.set(file.name);
            this.toast.success(`Attached medical note: ${file.name}`, 'File Attached');
        }
    }

    ngOnInit() {
        const students = this.state.profile()?.students || [];
        if (students.length) this.studentId.set(students[0].id || '');
    }

    approvedDays(): number {
        return this.state.absenceRequests()
            .filter(a => a.status === 'APPROVED')
            .reduce((total, a) => {
                if (!a.start_date || !a.end_date) return total;
                return total + Math.max(1, Math.round(
                    (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000
                ) + 1);
            }, 0);
    }

    pendingCount(): number {
        return this.state.absenceRequests().filter(a => a.status === 'PENDING').length;
    }

    submit() {
        if (!this.studentId() || !this.startDate() || !this.endDate() || !this.reason()) {
            this.errorMsg.set('Please fill out all required fields.');
            return;
        }
        this.submitting.set(true);
        this.errorMsg.set('');

        const fullNotes = this.medicalNoteFile()
            ? `[Medical Document Attached: ${this.medicalNoteFile()}] ${this.notes()}`.trim()
            : this.notes();

        this.api.submitAbsenceRequest({
            student_id: this.studentId(),
            start_date: this.startDate(),
            end_date: this.endDate(),
            reason: this.reason(),
            notes: fullNotes,
            status: 'PENDING'
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.success.set(true);
                this.startDate.set('');
                this.endDate.set('');
                this.notes.set('');
                this.medicalNoteFile.set(null);
                this.state.reloadAbsences();
                setTimeout(() => this.success.set(false), 5000);
            },
            error: (err) => {
                this.submitting.set(false);
                this.errorMsg.set(err?.error?.error || 'Failed to submit request.');
            }
        });
    }

    statusClass(status: string): string {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    }
}
