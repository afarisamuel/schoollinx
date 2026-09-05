import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExamService, Exam } from '../../../core/infrastructure/exam/exam.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-exam-list',
    standalone: true,
    imports: [CommonModule, DatePipe, RouterLink, FormsModule],
    templateUrl: './exam-list.component.html'
})
export class ExamListComponent implements OnInit {
    private examService = inject(ExamService);
    private periodService = inject(AcademicPeriodService);
    private toast = inject(ToastService);

    // Data State
    exams = signal<Exam[]>([]);
    periods = signal<AcademicPeriod[]>([]);
    loading = signal(true);
    isSaving = signal(false);

    // Filters & View State
    searchQuery = signal('');
    selectedFilterPeriod = signal('ALL');
    selectedStatusFilter = signal<'ALL' | 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED'>('ALL');
    viewMode = signal<'grid' | 'table'>('grid');

    // Modals
    showModal = signal(false);
    editingExamId = signal<string | null>(null);
    deletingExam = signal<Exam | null>(null);

    // Form State
    examForm = signal<Partial<Exam>>({
        title: '',
        description: '',
        academic_year: '',
        term: '',
        status: 'DRAFT',
        start_date: '',
        end_date: ''
    });

    formPeriodId = signal('');
    formTermIndex = signal(1);

    // Computed form helpers
    formPeriod = computed(() => this.periods().find(p => p.id === this.formPeriodId()));
    formAvailableTerms = computed(() => {
        const p = this.formPeriod();
        if (!p) return [1, 2, 3];
        return Array.from({ length: p.term_count || 3 }, (_, i) => i + 1);
    });

    // Computed KPI Metrics
    totalExamsCount = computed(() => this.exams().length);
    draftExamsCount = computed(() => this.exams().filter(e => e.status === 'DRAFT').length);
    scheduledExamsCount = computed(() => this.exams().filter(e => e.status === 'SCHEDULED' || (!e.status && !!e.start_date)).length);
    publishedExamsCount = computed(() => this.exams().filter(e => e.status === 'PUBLISHED').length);
    completedExamsCount = computed(() => this.exams().filter(e => e.status === 'COMPLETED').length);
    totalSchedulesCount = computed(() => this.exams().reduce((acc, e) => acc + (e.schedules?.length || 0), 0));

    // Filtered Exams
    filteredExams = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const periodFilter = this.selectedFilterPeriod();
        const statusFilter = this.selectedStatusFilter();

        return this.exams().filter(exam => {
            // Search query filter
            const matchesQuery = !query ||
                exam.title?.toLowerCase().includes(query) ||
                exam.description?.toLowerCase().includes(query) ||
                exam.academic_year?.toLowerCase().includes(query) ||
                exam.term?.toLowerCase().includes(query);

            // Period filter
            const matchesPeriod = periodFilter === 'ALL' || exam.academic_year === periodFilter;

            // Status filter
            const matchesStatus = statusFilter === 'ALL' || exam.status === statusFilter;

            return matchesQuery && matchesPeriod && matchesStatus;
        });
    });

    ngOnInit() {
        this.loadExams();
        this.loadPeriods();
    }

    loadExams() {
        this.loading.set(true);
        this.examService.getExams().subscribe({
            next: (data) => {
                this.exams.set(data || []);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load exams', err);
                this.toast.error('Failed to load examinations list');
                this.loading.set(false);
            }
        });
    }

    loadPeriods() {
        this.periodService.getAll().subscribe({
            next: (data) => {
                this.periods.set(data || []);
                const activePeriod = data?.find(p => p.is_active);
                if (activePeriod && !this.formPeriodId()) {
                    this.formPeriodId.set(activePeriod.id);
                    this.formTermIndex.set(activePeriod.current_term || 1);
                }
            },
            error: (err) => console.error('Failed to load periods', err)
        });
    }

    openCreateModal(template?: { title: string; description: string; status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' }) {
        this.editingExamId.set(null);
        const activePeriod = this.periods().find(p => p.is_active) || this.periods()[0];
        
        if (activePeriod) {
            this.formPeriodId.set(activePeriod.id);
            this.formTermIndex.set(activePeriod.current_term || 1);
        }

        const now = new Date();
        const startStr = now.toISOString().split('T')[0];
        const end = new Date();
        end.setDate(end.getDate() + 14);
        const endStr = end.toISOString().split('T')[0];

        this.examForm.set({
            title: template?.title || '',
            description: template?.description || '',
            academic_year: activePeriod ? activePeriod.name : '',
            term: activePeriod ? `${activePeriod.term_type} ${activePeriod.current_term || 1}` : 'Term 1',
            status: template?.status || 'DRAFT',
            start_date: startStr,
            end_date: endStr
        });

        this.showModal.set(true);
    }

    openEditModal(exam: Exam, event?: Event) {
        if (event) event.stopPropagation();
        this.editingExamId.set(exam.id);

        // Match period
        const matchingPeriod = this.periods().find(p => p.name === exam.academic_year);
        if (matchingPeriod) {
            this.formPeriodId.set(matchingPeriod.id);
            // Try parsing term number from term string e.g. "Term 2" or "Semester 1"
            const match = exam.term?.match(/\d+/);
            if (match) {
                this.formTermIndex.set(parseInt(match[0], 10));
            }
        }

        // Format dates for date inputs (YYYY-MM-DD)
        const formatForInput = (dStr?: string) => {
            if (!dStr) return '';
            try {
                return new Date(dStr).toISOString().split('T')[0];
            } catch {
                return dStr;
            }
        };

        this.examForm.set({
            title: exam.title,
            description: exam.description,
            academic_year: exam.academic_year,
            term: exam.term,
            status: exam.status || 'DRAFT',
            start_date: formatForInput(exam.start_date),
            end_date: formatForInput(exam.end_date)
        });

        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.editingExamId.set(null);
    }

    saveExam() {
        const form = this.examForm();
        if (!form.title?.trim()) {
            this.toast.warning('Please provide an Exam Title');
            return;
        }

        const p = this.formPeriod();
        const payload: Partial<Exam> = {
            title: form.title.trim(),
            description: form.description || '',
            academic_year: p ? p.name : (form.academic_year || ''),
            term: p ? `${p.term_type} ${this.formTermIndex()}` : (form.term || `Term ${this.formTermIndex()}`),
            status: form.status || 'DRAFT',
            start_date: form.start_date ? new Date(form.start_date).toISOString() : '',
            end_date: form.end_date ? new Date(form.end_date).toISOString() : ''
        };

        this.isSaving.set(true);
        const editingId = this.editingExamId();

        if (editingId) {
            this.examService.updateExam(editingId, payload).subscribe({
                next: (updated) => {
                    this.toast.success('Exam details updated successfully');
                    this.isSaving.set(false);
                    this.closeModal();
                    this.loadExams();
                },
                error: (err) => {
                    console.error('Failed to update exam', err);
                    this.toast.error('Failed to update exam');
                    this.isSaving.set(false);
                }
            });
        } else {
            this.examService.createExam(payload).subscribe({
                next: (created) => {
                    this.toast.success('New Examination created successfully');
                    this.isSaving.set(false);
                    this.closeModal();
                    this.loadExams();
                },
                error: (err) => {
                    console.error('Failed to create exam', err);
                    this.toast.error('Failed to create exam');
                    this.isSaving.set(false);
                }
            });
        }
    }

    quickUpdateStatus(exam: Exam, newStatus: 'DRAFT' | 'PUBLISHED' | 'COMPLETED', event?: Event) {
        if (event) event.stopPropagation();
        this.examService.updateExam(exam.id, { ...exam, status: newStatus }).subscribe({
            next: () => {
                this.toast.success(`Exam marked as ${newStatus}`);
                this.loadExams();
            },
            error: (err) => {
                console.error('Failed to update status', err);
                this.toast.error('Failed to change status');
            }
        });
    }

    promptDelete(exam: Exam, event?: Event) {
        if (event) event.stopPropagation();
        this.deletingExam.set(exam);
    }

    cancelDelete() {
        this.deletingExam.set(null);
    }

    confirmDelete() {
        const exam = this.deletingExam();
        if (!exam) return;

        this.examService.deleteExam(exam.id).subscribe({
            next: () => {
                this.toast.success(`Exam "${exam.title}" deleted`);
                this.deletingExam.set(null);
                this.loadExams();
            },
            error: (err) => {
                console.error('Failed to delete exam', err);
                this.toast.error('Failed to delete exam');
                this.deletingExam.set(null);
            }
        });
    }

    getRelativeDaysStatus(startStr?: string, endStr?: string): { text: string; color: string } {
        if (!startStr || !endStr) {
            return { text: 'Schedule Pending', color: 'text-text-muted bg-white/5 border-white/10' };
        }
        const now = new Date();
        const start = new Date(startStr);
        const end = new Date(endStr);

        if (now < start) {
            const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) return { text: 'Starts Tomorrow', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            return { text: `Starts in ${diffDays} days`, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
        } else if (now >= start && now <= end) {
            return { text: 'Ongoing Assessment', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
        } else {
            return { text: 'Concluded', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
        }
    }
}
