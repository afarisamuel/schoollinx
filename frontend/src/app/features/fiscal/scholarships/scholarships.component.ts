import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiscalService, Scholarship, ScholarshipStatus } from '../../../core/infrastructure/fiscal/fiscal.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-scholarships',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './scholarships.component.html',
    styleUrl: './scholarships.component.css'
})
export class ScholarshipsComponent implements OnInit {
    private fiscalService = inject(FiscalService);
    private studentService = inject(StudentService);
    private dialog = inject(DialogService);

    // State
    scholarships = signal<Scholarship[]>([]);
    students = signal<Student[]>([]);
    isLoading = signal(false);
    showForm = signal(false);
    searchStudentTerm = signal('');
    searchScholarshipTerm = signal('');
    statusFilter = signal<ScholarshipStatus | 'ALL'>('ALL');
    isSubmitting = signal(false);

    // Form state
    form = signal<Partial<Scholarship>>({
        name: '',
        type: 'PERCENTAGE',
        value: 0,
        student_id: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        reason: '',
    });

    selectedStudent = signal<Student | null>(null);
    studentSearchResults = signal<Student[]>([]);
    showStudentDropdown = signal(false);

    // Computed KPI Stats
    totalAwarded = computed(() => {
        return this.scholarships()
            .filter(s => s.status === 'ACTIVE' || s.status === 'APPROVED')
            .reduce((sum, s) => sum + (s.type === 'FIXED_AMOUNT' ? s.value : 0), 0);
    });

    activeCount = computed(() => {
        return this.scholarships().filter(s => s.status === 'ACTIVE' || s.status === 'APPROVED').length;
    });

    pendingCount = computed(() => {
        return this.scholarships().filter(s => s.status === 'PENDING').length;
    });

    filteredScholarships = computed(() => {
        const term = this.searchScholarshipTerm().toLowerCase();
        const statusFilter = this.statusFilter();
        return this.scholarships().filter(s => {
            const matchesTerm = !term ||
                s.name.toLowerCase().includes(term) ||
                `${s.student?.first_name} ${s.student?.last_name}`.toLowerCase().includes(term);
            const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
            return matchesTerm && matchesStatus;
        });
    });

    ngOnInit(): void {
        this.loadAllScholarships();
        this.loadStudents();
    }

    loadAllScholarships(): void {
        this.isLoading.set(true);
        this.fiscalService.getAllScholarships().subscribe({
            next: (data) => {
                this.scholarships.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    clearSelectedStudent(): void {
        this.selectedStudent.set(null);
        this.searchStudentTerm.set('');
        this.loadAllScholarships();
    }

    loadStudents(): void {
        this.studentService.getStudents().subscribe(data => this.students.set(data));
    }

    onStudentSearch(term: string): void {
        this.searchStudentTerm.set(term);
        if (term.length < 2) {
            this.studentSearchResults.set([]);
            this.showStudentDropdown.set(false);
            return;
        }
        const results = this.students().filter(s =>
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(term.toLowerCase()) ||
            (s.enrollment_num || '').toLowerCase().includes(term.toLowerCase())
        ).slice(0, 8);
        this.studentSearchResults.set(results);
        this.showStudentDropdown.set(true);
    }

    selectStudent(student: Student): void {
        this.selectedStudent.set(student);
        this.form.update(f => ({ ...f, student_id: student.id! }));
        this.searchStudentTerm.set(`${student.first_name} ${student.last_name}`);
        this.showStudentDropdown.set(false);
        // Load existing scholarships for this student
        this.isLoading.set(true);
        this.fiscalService.getScholarshipsByStudent(student.id!).subscribe({
            next: (data) => {
                this.scholarships.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    openForm(): void {
        this.form.set({
            name: '',
            type: 'PERCENTAGE',
            value: 0,
            student_id: this.selectedStudent()?.id || '',
            valid_from: new Date().toISOString().split('T')[0],
            valid_until: '',
            reason: '',
        });
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    updateForm(field: string, value: any): void {
        this.form.update(f => ({ ...f, [field]: value }));
    }

    submit(): void {
        const f = this.form();
        if (!f.student_id || !f.name || !f.valid_until || (f.value ?? 0) <= 0) {
            this.dialog.alert('Please fill in all required fields.', 'Validation Error', 'warning');
            return;
        }
        this.isSubmitting.set(true);
        this.fiscalService.applyScholarship(f).subscribe({
            next: (created) => {
                this.scholarships.update(s => [created, ...s]);
                this.showForm.set(false);
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.dialog.alert(err.error?.error || 'Failed to apply scholarship.', 'Error', 'danger');
                this.isSubmitting.set(false);
            }
        });
    }

    updateStatus(id: string, status: ScholarshipStatus): void {
        const labels: Record<string, string> = {
            'PENDING': 'Pending',
            'APPROVED': 'Approve',
            'ACTIVE': 'Activate',
            'REJECTED': 'Reject',
            'REVOKED': 'Revoke',
        };
        const actionLabel = labels[status] || 'Update';

        this.dialog.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} this scholarship?`, `${actionLabel} Scholarship`, status === 'REJECTED' || status === 'REVOKED' ? 'danger' : 'info').subscribe((confirmed: boolean) => {
            if (!confirmed) return;
            this.fiscalService.updateScholarshipStatus(id, status).subscribe({
                next: () => {
                    this.scholarships.update(s => s.map(sc =>
                        sc.id === id ? { ...sc, status } : sc
                    ));
                },
                error: (err) => this.dialog.alert(err.error?.error || 'Failed to update status.', 'Error', 'danger')
            });
        });
    }

    getStatusBadgeClass(status?: ScholarshipStatus): string {
        switch (status) {
            case 'ACTIVE': return 'badge-active';
            case 'APPROVED': return 'badge-approved';
            case 'PENDING': return 'badge-pending';
            case 'REJECTED': return 'badge-rejected';
            case 'REVOKED': return 'badge-revoked';
            default: return 'badge-pending';
        }
    }

    formatValue(s: Scholarship): string {
        if (s.type === 'PERCENTAGE') return `${s.value}%`;
        return `GH₵${s.value.toFixed(2)}`;
    }
}
