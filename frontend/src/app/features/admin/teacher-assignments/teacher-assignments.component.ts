import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TeacherAssignmentService, TeacherAssignment } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { PageLoaderComponent } from '../../../shared/ui/page-loader/page-loader.component';

export interface ClassSubjectRow {
    subject: Subject;
    assignment?: TeacherAssignment;
    teacher?: Teacher;
    isSaving?: boolean;
}

@Component({
    selector: 'app-teacher-assignments',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, PageLoaderComponent],
    templateUrl: './teacher-assignments.component.html',
    styleUrl: './teacher-assignments.component.css'
})
export class TeacherAssignmentsComponent implements OnInit {
    private assignmentService = inject(TeacherAssignmentService);
    private teacherService = inject(TeacherService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private academicPeriodService = inject(AcademicPeriodService);
    private dialog = inject(DialogService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private platformId = inject(PLATFORM_ID);

    // Global Collections
    teachers = signal<Teacher[]>([]);
    subjects = signal<Subject[]>([]);
    classes = signal<Class[]>([]);
    allAssignments = signal<TeacherAssignment[]>([]);

    // View Modes: 'by-class' | 'by-teacher' | 'master-roster'
    viewMode = signal<'by-class' | 'by-teacher' | 'master-roster'>('by-class');

    // By-Class State
    selectedClassId = signal<string | null>(null);
    activeClass = computed(() => this.classes().find(c => c.id === this.selectedClassId()));

    // By-Teacher Matrix State
    selectedTeacherId = signal<string | null>(null);
    activeTeacher = computed(() => this.teachers().find(t => t.id === this.selectedTeacherId()));
    searchQuery = signal('');
    filteredTeachers = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        if (!q) return this.teachers();
        return this.teachers().filter(t => 
            (`${t.first_name || ''} ${t.last_name || ''}`).toLowerCase().includes(q) || 
            (t.email || '').toLowerCase().includes(q) ||
            (t.employee_id || '').toLowerCase().includes(q)
        );
    });

    getInitials(firstName?: string, lastName?: string): string {
        const f = firstName ? firstName.charAt(0) : '';
        const l = lastName ? lastName.charAt(0) : '';
        return (f + l).toUpperCase() || 'ED';
    }

    // Matrix Active Edit State (Drafting)
    pendingAdditions = signal<Partial<TeacherAssignment>[]>([]);
    pendingRemovals = signal<string[]>([]); // Array of assignment IDs

    // Master Roster State
    rosterSearch = signal('');
    rosterClassFilter = signal('all');
    rosterSubjectFilter = signal('all');
    rosterTeacherFilter = signal('all');

    filteredAssignments = computed(() => {
        const q = this.rosterSearch().toLowerCase().trim();
        const cf = this.rosterClassFilter();
        const sf = this.rosterSubjectFilter();
        const tf = this.rosterTeacherFilter();

        return this.allAssignments().filter(a => {
            const matchClass = cf === 'all' || a.class_id === cf;
            const matchSubject = sf === 'all' || a.subject_id === sf;
            const matchTeacher = tf === 'all' || a.teacher_id === tf;

            if (!matchClass || !matchSubject || !matchTeacher) return false;

            if (!q) return true;

            const teacherName = a.teacher ? `${a.teacher.first_name} ${a.teacher.last_name}`.toLowerCase() : '';
            const className = a.class?.name?.toLowerCase() || '';
            const subjectName = a.subject?.name?.toLowerCase() || '';
            const subjectCode = a.subject?.code?.toLowerCase() || '';

            return teacherName.includes(q) || className.includes(q) || subjectName.includes(q) || subjectCode.includes(q);
        });
    });

    // Computed Stats
    totalAssignmentsCount = computed(() => this.allAssignments().length);
    assignedTeachersCount = computed(() => new Set(this.allAssignments().map(a => a.teacher_id)).size);
    classesCoveredCount = computed(() => new Set(this.allAssignments().map(a => a.class_id)).size);
    totalSubjectsCount = computed(() => this.subjects().length);

    // Class Subjects View Model
    classSubjectRows = computed<ClassSubjectRow[]>(() => {
        const classId = this.selectedClassId();
        if (!classId) return [];

        const classAssignments = this.allAssignments().filter(a => a.class_id === classId);
        const teachersList = this.teachers();

        return this.subjects().map(subj => {
            const assignment = classAssignments.find(a => a.subject_id === subj.id);
            const teacher = assignment ? teachersList.find(t => t.id === assignment.teacher_id) : undefined;
            return {
                subject: subj,
                assignment,
                teacher
            };
        });
    });

    // Quick Assign Modal State
    showAssignModal = signal(false);
    modalTeacherId = signal('');
    modalClassId = signal('');
    modalSubjectId = signal('');
    modalSaving = signal(false);

    // Academic Year
    academicYear = signal('2024/2025');
    
    // Status
    isLoading = signal(true);
    isSaving = signal(false);
    successMsg = signal('');
    errorMsg = signal('');

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadCoreData();
        }
    }

    loadCoreData() {
        this.isLoading.set(true);
        forkJoin({
            teachers: this.teacherService.getTeachers(),
            subjects: this.subjectService.getSubjects(),
            classes: this.classService.getClasses(),
            assignments: this.assignmentService.getAll(),
            activePeriod: this.academicPeriodService.getActive()
        }).subscribe({
            next: (data: any) => {
                this.teachers.set(data.teachers || []);
                this.subjects.set(data.subjects || []);
                this.classes.set(data.classes || []);
                this.allAssignments.set(data.assignments || []);
                if (data.activePeriod?.name) {
                    this.academicYear.set(data.activePeriod.name);
                }
                this.isLoading.set(false);

                // Auto-select initial class or check query parameters
                this.handleQueryParams();
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Failed to load curriculum allocation data.', 'Load Error');
            }
        });
    }

    private handleQueryParams() {
        this.route.queryParams.subscribe(params => {
            if (params['classId']) {
                this.selectedClassId.set(params['classId']);
                this.viewMode.set('by-class');
            } else if (params['teacherId']) {
                this.selectedTeacherId.set(params['teacherId']);
                this.viewMode.set('by-teacher');
            } else if (this.classes().length > 0 && !this.selectedClassId()) {
                this.selectedClassId.set(this.classes()[0].id);
            }
        });
    }

    refreshAssignments() {
        this.assignmentService.getAll().subscribe(data => {
            this.allAssignments.set(data || []);
        });
    }

    // ── By-Class Mode Methods ─────────────────────────────────────────────

    selectClass(classId: string) {
        this.selectedClassId.set(classId);
    }

    onClassSubjectTeacherChange(subjectId: string, event: Event) {
        const select = event.target as HTMLSelectElement;
        const newTeacherId = select.value;
        const classId = this.selectedClassId();
        if (!classId) return;

        const currentAssignment = this.allAssignments().find(a => a.class_id === classId && a.subject_id === subjectId);

        if (!newTeacherId) {
            // Unassign
            if (currentAssignment) {
                this.assignmentService.unassign(currentAssignment.id).subscribe({
                    next: () => {
                        this.toast.info('Teacher unassigned from subject.');
                        this.refreshAssignments();
                    },
                    error: () => {
                        this.toast.error('Failed to unassign teacher.');
                        this.refreshAssignments();
                    }
                });
            }
            return;
        }

        // If assignment exists, unassign old first then assign new
        if (currentAssignment) {
            if (currentAssignment.teacher_id === newTeacherId) return; // No change
            this.assignmentService.unassign(currentAssignment.id).subscribe({
                next: () => {
                    this.assignmentService.assign({
                        teacher_id: newTeacherId,
                        class_id: classId,
                        subject_id: subjectId,
                        academic_year: this.academicYear()
                    }).subscribe({
                        next: () => {
                            this.toast.success('Subject allocation updated successfully.');
                            this.refreshAssignments();
                        },
                        error: () => {
                            this.toast.error('Failed to assign new teacher.');
                            this.refreshAssignments();
                        }
                    });
                }
            });
        } else {
            // Create brand new assignment
            this.assignmentService.assign({
                teacher_id: newTeacherId,
                class_id: classId,
                subject_id: subjectId,
                academic_year: this.academicYear()
            }).subscribe({
                next: () => {
                    this.toast.success('Teacher allocated to subject successfully.');
                    this.refreshAssignments();
                },
                error: (err) => {
                    this.toast.error(err?.error?.error || 'Failed to allocate teacher.');
                    this.refreshAssignments();
                }
            });
        }
    }

    unassignSubject(assignmentId: string, subjectName: string) {
        this.dialog.confirm(`Unassign teacher from ${subjectName}?`, 'Confirm Unassignment', 'warning', 'Unassign').subscribe(confirmed => {
            if (confirmed) {
                this.assignmentService.unassign(assignmentId).subscribe({
                    next: () => {
                        this.toast.success(`Removed allocation for ${subjectName}.`);
                        this.refreshAssignments();
                    },
                    error: () => {
                        this.toast.error('Failed to unassign teacher.');
                    }
                });
            }
        });
    }

    // ── By-Teacher Matrix Mode Methods ────────────────────────────────────

    selectTeacher(id: string) {
        if (this.pendingAdditions().length > 0 || this.pendingRemovals().length > 0) {
            this.dialog.confirm("You have unsaved changes. Discard and switch teacher?", "Unsaved Changes", "warning", "Discard").subscribe((confirmed: boolean) => {
                if (confirmed) this.executeTeacherSwitch(id);
            });
            return;
        }
        this.executeTeacherSwitch(id);
    }

    private executeTeacherSwitch(id: string) {
        this.selectedTeacherId.set(id);
        this.pendingAdditions.set([]);
        this.pendingRemovals.set([]);
        this.successMsg.set('');
        this.errorMsg.set('');
    }

    getExistingAssignment(subjectId: string, classId: string): TeacherAssignment | undefined {
        return this.allAssignments().find(a => a.subject_id === subjectId && a.class_id === classId);
    }

    isAssignedToSelected(subjectId: string, classId: string): boolean {
        const existing = this.getExistingAssignment(subjectId, classId);
        if (existing && existing.teacher_id === this.selectedTeacherId() && !this.pendingRemovals().includes(existing.id)) return true;
        
        const pending = this.pendingAdditions().find(a => a.subject_id === subjectId && a.class_id === classId);
        if (pending) return true;

        return false;
    }

    isAssignedToOther(subjectId: string, classId: string): boolean {
        const existing = this.getExistingAssignment(subjectId, classId);
        return existing !== undefined && existing.teacher_id !== this.selectedTeacherId();
    }

    getOtherTeacherName(subjectId: string, classId: string): string {
        const existing = this.getExistingAssignment(subjectId, classId);
        if (!existing) return '';
        const t = this.teachers().find(t => t.id === existing.teacher_id);
        return t ? `${t.first_name} ${t.last_name}` : 'Another Teacher';
    }

    toggleCell(subjectId: string, classId: string) {
        if (!this.selectedTeacherId()) return;

        if (this.isAssignedToOther(subjectId, classId)) {
            const name = this.getOtherTeacherName(subjectId, classId);
            this.dialog.alert(`This class/subject is already assigned to ${name}. Unassign them first or reassign from the By-Class view.`, 'Assignment Conflict', 'warning').subscribe();
            return;
        }

        const existing = this.getExistingAssignment(subjectId, classId);

        if (existing) {
            const removals = [...this.pendingRemovals()];
            if (removals.includes(existing.id)) {
                this.pendingRemovals.set(removals.filter(id => id !== existing.id));
            } else {
                removals.push(existing.id);
                this.pendingRemovals.set(removals);
            }
        } else {
            const additions = [...this.pendingAdditions()];
            const idx = additions.findIndex(a => a.subject_id === subjectId && a.class_id === classId);
            
            if (idx > -1) {
                additions.splice(idx, 1);
                this.pendingAdditions.set(additions);
            } else {
                additions.push({
                    teacher_id: this.selectedTeacherId() as string,
                    subject_id: subjectId,
                    class_id: classId,
                    academic_year: this.academicYear()
                });
                this.pendingAdditions.set(additions);
            }
        }
    }

    hasChanges(): boolean {
        return this.pendingAdditions().length > 0 || this.pendingRemovals().length > 0;
    }

    applyChanges() {
        if (!this.hasChanges()) return;
        this.isSaving.set(true);
        this.successMsg.set('');
        this.errorMsg.set('');

        const ops = [];
        
        if (this.pendingRemovals().length > 0) {
            for (const id of this.pendingRemovals()) {
                ops.push(this.assignmentService.unassign(id));
            }
        }

        if (this.pendingAdditions().length > 0) {
            ops.push(this.assignmentService.bulkAssign(this.pendingAdditions()));
        }

        if (ops.length === 0) {
            this.isSaving.set(false);
            return;
        }

        forkJoin(ops).subscribe({
            next: () => {
                this.pendingAdditions.set([]);
                this.pendingRemovals.set([]);
                this.toast.success('Faculty schedule successfully updated.');
                this.refreshAssignments();
                this.isSaving.set(false);
            },
            error: (err) => {
                this.toast.error('Error saving schedule: ' + (err.error?.error || err.message));
                this.refreshAssignments();
                this.isSaving.set(false);
            }
        });
    }

    discardChanges() {
        this.pendingAdditions.set([]);
        this.pendingRemovals.set([]);
    }

    // ── Quick Assign Modal ────────────────────────────────────────────────

    openAssignModal(prefillClassId?: string, prefillSubjectId?: string, prefillTeacherId?: string) {
        this.modalClassId.set(prefillClassId || this.selectedClassId() || (this.classes()[0]?.id || ''));
        this.modalSubjectId.set(prefillSubjectId || (this.subjects()[0]?.id || ''));
        this.modalTeacherId.set(prefillTeacherId || this.selectedTeacherId() || (this.teachers()[0]?.id || ''));
        this.showAssignModal.set(true);
    }

    closeAssignModal() {
        this.showAssignModal.set(false);
        this.modalSaving.set(false);
    }

    submitModalAssign() {
        const teacherId = this.modalTeacherId();
        const classId = this.modalClassId();
        const subjectId = this.modalSubjectId();

        if (!teacherId || !classId || !subjectId) {
            this.toast.warning('Please select Teacher, Class, and Subject.');
            return;
        }

        this.modalSaving.set(true);

        // Check if an existing assignment for this class & subject exists
        const existing = this.allAssignments().find(a => a.class_id === classId && a.subject_id === subjectId);

        if (existing) {
            if (existing.teacher_id === teacherId) {
                this.toast.info('This teacher is already assigned to this subject and class.');
                this.modalSaving.set(false);
                this.closeAssignModal();
                return;
            }
            // Replace existing
            this.assignmentService.unassign(existing.id).subscribe({
                next: () => {
                    this.executeModalCreation(teacherId, classId, subjectId);
                },
                error: () => {
                    this.modalSaving.set(false);
                    this.toast.error('Failed to replace existing assignment.');
                }
            });
        } else {
            this.executeModalCreation(teacherId, classId, subjectId);
        }
    }

    private executeModalCreation(teacherId: string, classId: string, subjectId: string) {
        this.assignmentService.assign({
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId,
            academic_year: this.academicYear()
        }).subscribe({
            next: () => {
                this.modalSaving.set(false);
                this.closeAssignModal();
                this.toast.success('Teacher assigned successfully!');
                this.refreshAssignments();
            },
            error: (err) => {
                this.modalSaving.set(false);
                this.toast.error(err?.error?.error || 'Failed to create assignment.');
            }
        });
    }

    // ── Master Roster Action ──────────────────────────────────────────────

    deleteRosterAssignment(assignment: TeacherAssignment) {
        const tName = assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'Educator';
        const sName = assignment.subject?.name || 'Subject';
        const cName = assignment.class?.name || 'Class';

        this.dialog.confirm(
            `Revoke assignment: ${tName} for ${sName} in ${cName}?`,
            'Remove Allocation',
            'warning',
            'Revoke'
        ).subscribe(ok => {
            if (ok) {
                this.assignmentService.unassign(assignment.id).subscribe({
                    next: () => {
                        this.toast.success('Allocation successfully revoked.');
                        this.refreshAssignments();
                    },
                    error: () => {
                        this.toast.error('Failed to revoke allocation.');
                    }
                });
            }
        });
    }
}
