import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Teacher } from '../../../core/domain/teacher.model';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { FiscalService } from '../../../core/infrastructure/fiscal/fiscal.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { DocumentManagerComponent } from '../../../shared/components/document-manager/document-manager.component';
import { PaginationState, defaultPaginationState } from '../../../core/domain/pagination.model';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';

@Component({
    selector: 'app-teacher-list',
    imports: [RouterLink, CommonModule, DocumentManagerComponent],
    templateUrl: './teacher-list.component.html',
    standalone: true
})
export class TeacherListComponent implements OnInit {
    teachers = signal<Teacher[]>([]);
    selectedIds = signal<Set<string>>(new Set<string>());
    selectedTeacherForDocs = signal<Teacher | null>(null);

    // Pagination State
    pagination = signal<PaginationState>(defaultPaginationState());

    // Search & Filter
    searchQuery = signal<string>('');
    selectedSubject = signal<string>('all');
    selectedPortalStatus = signal<'all' | 'active' | 'pending' | 'fee_collectors'>('all');
    viewMode = signal<'table' | 'grid'>('table');
    subjects = signal<Subject[]>([]);

    activePortalsCount = computed(() => this.teachers().filter(t => t.user_id).length);
    portalProvisionRate = computed(() => {
        const total = this.teachers().length;
        if (total === 0) return 0;
        return Math.round((this.activePortalsCount() / total) * 100);
    });
    feeCollectorsCount = computed(() => this.teachers().filter(t => t.can_collect_fees).length);
    totalDepartments = computed(() => this.subjects().length);

    hasSelection = computed(() => this.selectedIds().size > 0);
    
    // Filtered list based on search, subject, and portal status
    filteredTeachers = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const subjectId = this.selectedSubject();
        const portalStatus = this.selectedPortalStatus();
        const list = this.teachers();
        
        let filtered = list;
        
        if (subjectId !== 'all') {
            filtered = filtered.filter(t => t.subjects?.some(s => s.id === subjectId));
        }

        if (portalStatus === 'active') {
            filtered = filtered.filter(t => !!t.user_id);
        } else if (portalStatus === 'pending') {
            filtered = filtered.filter(t => !t.user_id);
        } else if (portalStatus === 'fee_collectors') {
            filtered = filtered.filter(t => !!t.can_collect_fees);
        }
        
        if (query) {
            filtered = filtered.filter(t => 
                (t.first_name + ' ' + t.last_name).toLowerCase().includes(query) ||
                t.email?.toLowerCase().includes(query) ||
                t.phone_number?.includes(query) ||
                (t.id && t.id.toLowerCase().includes(query))
            );
        }
        
        return filtered;
    });

    // Computed property for paginated teachers
    paginatedTeachers = computed(() => {
        const list = this.filteredTeachers();
        const state = this.pagination();
        const startIndex = (state.currentPage - 1) * state.pageSize;
        return list.slice(startIndex, startIndex + state.pageSize);
    });

    isAllSelected = computed(() => {
        const _teachers = this.paginatedTeachers();
        return _teachers.length > 0 && this.selectedIds().size === _teachers.length;
    });
    constructor(
        private teacherService: TeacherService, 
        private fiscalService: FiscalService,
        private dialog: DialogService,
        private subjectService: SubjectService
    ) { }

    ngOnInit(): void {
        this.loadTeachers();
        this.loadSubjects();
    }

    loadTeachers() {
        this.teacherService.getTeachers().subscribe(data => {
            this.teachers.set(data);
            this.updatePaginationForList(data);
            this.selectedIds.set(new Set<string>());
        });
    }

    loadSubjects() {
        this.subjectService.getSubjects().subscribe(data => {
            this.subjects.set(data);
        });
    }

    onSearchChange(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        this.searchQuery.set(query);
        this.resetPagination();
    }

    onSubjectChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        this.selectedSubject.set(value);
        this.resetPagination();
    }

    resetPagination() {
        const filtered = this.filteredTeachers();
        this.updatePaginationForList(filtered);
    }

    private updatePaginationForList(list: Teacher[]) {
        this.pagination.update(state => ({
            ...state,
            totalCount: list.length,
            totalPages: Math.ceil(list.length / state.pageSize) || 1,
            currentPage: 1
        }));
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.pagination().totalPages) {
            this.pagination.update(state => ({ ...state, currentPage: page }));
        }
    }

    deleteTeacher(id: string) {
        this.dialog.confirm('Are you certain you want to expunge this educator record?', 'Expunge Educator', 'danger', 'Expunge').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teacherService.deleteTeacher(id).subscribe(() => {
                    this.loadTeachers();
                });
            }
        });
    }

    bulkDelete() {
        this.dialog.confirm(`Expunge ${this.selectedIds().size} educator records? This action cannot be undone.`, 'Bulk Data Expunge', 'danger', 'Expunge All').subscribe((confirmed: boolean) => {
            if (confirmed) {
                const ids = Array.from(this.selectedIds());
                this.teacherService.bulkDeleteTeachers(ids).subscribe(() => {
                    this.loadTeachers();
                });
            }
        });
    }

    toggleSelection(id: string) {
        const current = new Set(this.selectedIds());
        if (current.has(id)) {
            current.delete(id);
        } else {
            current.add(id);
        }
        this.selectedIds.set(current);
    }

    toggleAll() {
        if (this.isAllSelected()) {
            this.selectedIds.set(new Set<string>());
        } else {
            const allIds = new Set(this.paginatedTeachers().map(t => t.id!).filter(id => id != null));
            this.selectedIds.set(allIds);
        }
    }

    activatePortal(teacher: Teacher) {
        this.dialog.confirm(`Activate portal access for ${teacher.first_name}? This will generate a unique username and a temporary password which will be emailed to them.`, 'Activate Portal Access', 'info', 'Activate Access').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teacherService.activateTeacherPortal(teacher.id!).subscribe({
                    next: (res) => {
                        this.dialog.alert(`Portal access activated successfully! Credentials have been dispatched to ${teacher.email}. Username: ${res.username}`, 'Activation Successful', 'success');
                        this.loadTeachers();
                    },
                    error: (err) => {
                        const msg = err.error?.error || 'Execution of activation sequence failed.';
                        this.dialog.alert(msg, 'Activation Failure', 'danger');
                    }
                });
            }
        });
    }

    resetPassword(teacher: Teacher) {
        this.dialog.confirm(
            `Reset the portal password for ${teacher.first_name} ${teacher.last_name}? A new temporary password will be generated and emailed to them.`,
            'Reset Password',
            'warning',
            'Reset Password'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teacherService.resetPassword(teacher.id!).subscribe({
                    next: (res) => {
                        this.dialog.alert(
                            `Password reset successfully! New temporary password: <strong>${res.password}</strong><br><br>This has been sent to ${teacher.email}. They will be required to change it on next login.`,
                            'Password Reset Complete',
                            'success'
                        );
                    },
                    error: (err) => {
                        const msg = err.error?.error || 'Failed to reset password.';
                        this.dialog.alert(msg, 'Reset Failed', 'danger');
                    }
                });
            }
        });
    }

    toggleFeeCollection(teacher: Teacher) {
        const newState = !teacher.can_collect_fees;
        this.fiscalService.toggleTeacherPrivilege(teacher.id!, newState).subscribe({
            next: () => {
                this.loadTeachers();
            },
            error: (err) => {
                this.dialog.alert('Failed to update privilege', 'Error', 'danger').subscribe();
            }
        });
    }

    openDocumentModal(teacher: Teacher) {
        this.selectedTeacherForDocs.set(teacher);
    }

    closeDocModal() {
        this.selectedTeacherForDocs.set(null);
    }

    setPortalFilter(status: 'all' | 'active' | 'pending' | 'fee_collectors') {
        this.selectedPortalStatus.set(status);
        this.resetPagination();
    }

    setViewMode(mode: 'table' | 'grid') {
        this.viewMode.set(mode);
    }

    exportCSV() {
        const teachers = this.filteredTeachers();
        let csv = `Staff ID,Full Name,Email,Phone,Specialization Subjects,Portal Status,Fee Collection Privileged\n`;
        teachers.forEach(t => {
            const subjects = this.formatSubjects(t).replace(/"/g, '""');
            const portalStatus = t.user_id ? 'Active' : 'Pending';
            const feeCol = t.can_collect_fees ? 'Yes' : 'No';
            csv += `"${t.id || ''}","${t.first_name} ${t.last_name}","${t.email || ''}","${t.phone_number || ''}","${subjects}","${portalStatus}","${feeCol}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Faculty_Roster_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    printRoster() {
        window.print();
    }

    formatSubjects(teacher: Teacher): string {
        if (!teacher.subjects || teacher.subjects.length === 0) return 'Unassigned';
        return teacher.subjects.map(s => s.name).join(', ');
    }
}

