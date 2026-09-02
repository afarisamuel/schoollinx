import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Student } from '../../../core/domain/student.model';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ReportService } from '../../../core/infrastructure/report/report.service';
import { DocumentRequestModalComponent } from '../../../shared/components/document-request-modal/document-request-modal.component';
import { GraduationModalComponent } from '../graduation-modal/graduation-modal.component';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { PaginationState, defaultPaginationState } from '../../../core/domain/pagination.model';
import { PageLoaderComponent } from '../../../shared/ui/page-loader/page-loader.component';

@Component({
    selector: 'app-student-list',
    standalone: true,
    imports: [RouterLink, CommonModule, FormsModule, DocumentRequestModalComponent, GraduationModalComponent, PageLoaderComponent],
    templateUrl: './student-list.component.html',
    styleUrl: './student-list.component.css'
})
export class StudentListComponent implements OnInit {
    private dialog = inject(DialogService);
    loading = signal<boolean>(true);
    students = signal<Student[]>([]);
    selectedIds = signal<Set<string>>(new Set());
    selectedStudentForDocs = signal<Student | null>(null);
    selectedStudentForGraduation = signal<Student | null>(null);
    importResult = signal<{ imported: number; failed: number; errors: string[] } | null>(null);
    exportMenuOpen = signal(false);

    // View mode: 'grid' | 'table' — persisted in localStorage
    viewMode = signal<'grid' | 'table'>(
        (localStorage.getItem('students-view-mode') as 'grid' | 'table') || 'grid'
    );

    toggleViewMode() {
        const next = this.viewMode() === 'grid' ? 'table' : 'grid';
        this.viewMode.set(next);
        localStorage.setItem('students-view-mode', next);
    }

    // Pagination State
    pagination = signal<PaginationState>(defaultPaginationState());

    // Filter State
    searchTerm = signal('');
    selectedClassId = signal('');
    selectedLevel = signal<number | null>(null);
    classes = signal<Class[]>([]);
    scholasticLevels = signal<ScholasticLevel[]>([]);

    studentService = inject(StudentService);
    classService = inject(ClassService);
    reportService = inject(ReportService);
    slService = inject(ScholasticLevelService);

    filteredStudents = computed(() => {
        let list = this.students();
        const term = this.searchTerm().toLowerCase();
        const classId = this.selectedClassId();
        const targetLevel = this.selectedLevel();

        if (term) {
            const tokens = term.trim().split(/\s+/).filter(t => t.length > 0);
            if (tokens.length > 0) {
                list = list.filter(s => {
                    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                    const reverseName = `${s.last_name || ''} ${s.first_name || ''}`.toLowerCase();
                    const otherNames = (s.other_name || '').toLowerCase();
                    const enroll = (s.enrollment_num || '').toLowerCase();
                    return tokens.every(t => fullName.includes(t) || reverseName.includes(t) || otherNames.includes(t) || enroll.includes(t));
                });
            }
        }

        if (classId) {
            list = list.filter(s => s.class_id === classId);
        }

        if (targetLevel !== null) {
            list = list.filter(s => s.level === targetLevel);
        }

        return list;
    });

    isAllSelected = computed(() =>
        this.filteredStudents().length > 0 && this.selectedIds().size === this.filteredStudents().length
    );

    hasSelection = computed(() => this.selectedIds().size > 0);

    pageRange = computed(() => Array.from({ length: this.pagination().totalPages }, (_, i) => i + 1));


    ngOnInit(): void {
        this.loadStudents();
        this.loadReferenceData();
    }

    loadReferenceData() {
        this.classService.getClasses().subscribe(data => this.classes.set(data));
        this.slService.getAll().subscribe(data => this.scholasticLevels.set(data));
    }

    getLevelName(ordinal: number | undefined): string {
        if (ordinal === undefined) return '—';
        const level = this.scholasticLevels().find(l => l.ordinal === ordinal);
        return level ? level.name : `Level ${ordinal}`;
    }

    getClassName(classId: string | undefined): string {
        if (!classId) return '—';
        const cls = this.classes().find(c => c.id === classId);
        return cls ? cls.name : '—';
    }

    loadStudents(page: number = this.pagination().currentPage) {
        this.loading.set(true);
        this.studentService.getStudentsPaginated(page, this.pagination().pageSize).subscribe({
            next: (res) => {
                this.students.set(res.data || []);
                this.pagination.set({
                    currentPage: res.meta.current_page,
                    pageSize: res.meta.page_size,
                    totalCount: res.meta.total_count,
                    totalPages: res.meta.total_pages
                });
                this.selectedIds.set(new Set());
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.pagination().totalPages) {
            this.loadStudents(page);
        }
    }

    updateSearchTerm(term: string) {
        this.searchTerm.set(term);
        this.selectedIds.set(new Set()); // Clear selection when filtering
    }

    toggleSelection(id: string) {
        this.selectedIds.update(set => {
            const newSet = new Set(set);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }

    toggleAll() {
        if (this.isAllSelected()) {
            this.selectedIds.set(new Set());
        } else {
            this.selectedIds.set(new Set(this.filteredStudents().map(s => s.id!)));
        }
    }

    deleteStudent(id: string) {
        this.dialog.confirm('Are you sure you want to delete this student?', 'Delete Record', 'danger', 'Delete').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.studentService.deleteStudent(id).subscribe(() => {
                    this.loadStudents();
                });
            }
        });
    }

    bulkDelete() {
        const ids = Array.from(this.selectedIds());
        this.dialog.confirm(`Are you sure you want to delete ${ids.length} selected students?`, 'Bulk Deletion', 'danger', 'Delete All').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.studentService.bulkDeleteStudents(ids).subscribe(() => {
                    this.loadStudents();
                });
            }
        });
    }

    openDocumentModal(student: Student) {
        this.selectedStudentForDocs.set(student);
    }

    closeDocModal() {
        this.selectedStudentForDocs.set(null);
    }

    openGraduationModal(student: Student) {
        this.selectedStudentForGraduation.set(student);
    }

    closeGraduationModal() {
        this.selectedStudentForGraduation.set(null);
    }

    // --- Export ---
    exportCSV() {
        this.studentService.exportCSV();
        this.exportMenuOpen.set(false);
    }

    exportExcel() {
        this.studentService.exportExcel();
        this.exportMenuOpen.set(false);
    }

    downloadCSVTemplate() {
        this.studentService.downloadImportTemplate('csv');
        this.exportMenuOpen.set(false);
    }

    downloadExcelTemplate() {
        this.studentService.downloadImportTemplate('excel');
        this.exportMenuOpen.set(false);
    }

    toggleExportMenu() {
        this.exportMenuOpen.update(v => !v);
    }

    // --- Import ---
    triggerImport() {
        document.getElementById('student-import-input')?.click();
    }

    onFileImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.importResult.set(null);

        this.studentService.importFile(file).subscribe({
            next: result => {
                this.importResult.set(result);
                this.loadStudents();
                input.value = '';
            },
            error: () => {
                this.importResult.set({ imported: 0, failed: 1, errors: ['Server error during import.'] });
                input.value = '';
            }
        });
    }

    dismissImportResult() {
        this.importResult.set(null);
    }
}
