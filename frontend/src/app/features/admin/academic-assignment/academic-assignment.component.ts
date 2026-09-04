import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurriculumService, AcademicAssignment } from '../../../core/infrastructure/curriculum/curriculum.service';
import { ClassService, ClassTermLock, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-academic-assignment',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './academic-assignment.component.html',
    styleUrl: './academic-assignment.component.css'
})
export class AcademicAssignmentComponent implements OnInit {
    private curriculumService = inject(CurriculumService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private teacherService = inject(TeacherService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);
    private academicPeriodService = inject(AcademicPeriodService);

    classes = signal<Class[]>([]);
    teachers = signal<Teacher[]>([]);
    subjects = signal<Subject[]>([]);
    assignments = signal<AcademicAssignment[]>([]);
    locks = signal<ClassTermLock[]>([]);

    terms = signal<string[]>([]);
    selectedClassId: string | null = null;
    academicYear = '2026/2027';
    searchAssignmentQuery = signal<string>('');
    isSubmitting = signal<boolean>(false);
    isLoadingAssignments = signal<boolean>(false);

    selectedClass = computed(() => this.classes().find(c => c.id === this.selectedClassId) || null);

    filteredAssignments = computed(() => {
        const query = this.searchAssignmentQuery().toLowerCase().trim();
        const list = this.assignments();
        if (!query) return list;
        return list.filter(a =>
            a.subject?.name?.toLowerCase().includes(query) ||
            a.subject?.code?.toLowerCase().includes(query) ||
            a.teacher?.first_name?.toLowerCase().includes(query) ||
            a.teacher?.last_name?.toLowerCase().includes(query)
        );
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadClasses();
            this.loadTeachers();
            this.loadSubjects();
            this.loadTerms();
        }
    }

    loadTerms() {
        this.academicPeriodService.getActive().subscribe({
            next: (period) => {
                if (period && period.id) {
                    if (period.name) {
                        this.academicYear = period.name;
                    }
                    this.academicPeriodService.getTerms(period.id).subscribe(termsData => {
                        const sortedTerms = termsData.sort((a, b) => a.term_number - b.term_number);
                        this.terms.set(sortedTerms.map(t => t.name));
                    });
                }
            },
            error: () => {
                // Fallback to defaults if no active period is found
                this.terms.set(['Term 1', 'Term 2', 'Term 3']);
            }
        });
    }

    loadClasses() {
        this.classService.getClasses().subscribe(data => {
            this.classes.set(data);
        });
    }

    loadTeachers() {
        this.teacherService.getTeachers().subscribe(data => {
            this.teachers.set(data);
        });
    }

    loadSubjects() {
        this.subjectService.getSubjects().subscribe(data => {
            this.subjects.set(data);
        });
    }

    selectClass(classId: string) {
        this.selectedClassId = classId;
        this.loadAssignments();
    }

    loadAssignments() {
        if (this.selectedClassId) {
            this.isLoadingAssignments.set(true);
            this.curriculumService.getAssignmentsByClass(this.selectedClassId).subscribe({
                next: (data) => {
                    const filteredData = (data || []).filter(assignment => assignment.class_id === this.selectedClassId);
                    this.assignments.set(filteredData);
                    this.isLoadingAssignments.set(false);
                },
                error: () => {
                    this.isLoadingAssignments.set(false);
                }
            });
            this.loadLocks(this.selectedClassId);
        } else {
            this.assignments.set([]);
            this.locks.set([]);
        }
    }

    loadLocks(classId: string) {
        this.classService.getClassLocks(classId).subscribe({
            next: (data) => {
                this.locks.set(data || []);
            }
        });
    }

    toggleLock(term: string) {
        if (!this.selectedClassId) return;
        const currentLock = this.locks().find(l => l.term === term);
        const newLock: ClassTermLock = {
            class_id: this.selectedClassId,
            term: term,
            is_locked: currentLock ? !currentLock.is_locked : true
        };
        this.classService.upsertClassLock(this.selectedClassId, newLock).subscribe({
            next: () => {
                this.loadLocks(this.selectedClassId!);
            }
        });
    }

    getLockStatus(term: string): boolean {
        const lock = this.locks().find(l => l.term === term);
        return lock ? lock.is_locked : false;
    }

    createAssignment(event: any) {
        event.preventDefault();
        if (!this.selectedClassId) {
            this.dialog.alert('Please select a target class first.', 'Class Required', 'warning');
            return;
        }

        const formData = new FormData(event.target);
        const teacherId = formData.get('teacher_id') as string;
        const subjectId = formData.get('subject_id') as string;

        if (!teacherId || !subjectId) {
            this.dialog.alert('Please select both a Teacher and a Subject.', 'Required Fields', 'warning');
            return;
        }

        // Check if subject is already assigned in this class
        const existing = this.assignments().find(a => a.subject_id === subjectId);
        if (existing) {
            this.dialog.confirm(
                `This subject is already assigned to ${existing.teacher?.first_name} ${existing.teacher?.last_name}. Reassign to the newly selected instructor?`,
                'Reassign Course',
                'warning',
                'Reassign'
            ).subscribe((confirmed) => {
                if (confirmed) {
                    this.executeAssignment(teacherId, subjectId, event.target);
                }
            });
            return;
        }

        this.executeAssignment(teacherId, subjectId, event.target);
    }

    private executeAssignment(teacherId: string, subjectId: string, formElement?: HTMLFormElement) {
        this.isSubmitting.set(true);
        const assignment = {
            teacher_id: teacherId,
            class_id: this.selectedClassId!,
            subject_id: subjectId,
            academic_year: this.academicYear
        };

        this.curriculumService.assignTeacher(assignment).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.dialog.alert('Instructor has been assigned to this course successfully!', 'Assignment Created', 'success');
                this.loadAssignments();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.dialog.alert(err.error?.error || 'Failed to establish assignment.', 'Error', 'error');
            }
        });
    }

    removeAssignment(id: string) {
        this.dialog.confirm(
            'Decommissioning this instructional assignment will remove the instructor from this subject/class pairing. Proceed?',
            'Remove Assignment',
            'warning',
            'Remove'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.curriculumService.removeAssignment(id).subscribe({
                    next: () => {
                        this.dialog.alert('Instructional assignment removed.', 'Removed', 'info');
                        this.loadAssignments();
                    },
                    error: (err) => {
                        this.dialog.alert(err.error?.error || 'Failed to remove assignment.', 'Error', 'error');
                    }
                });
            }
        });
    }

    formatTeacherSubjects(teacher: Teacher): string {
        if (!teacher.subjects || teacher.subjects.length === 0) return 'General';
        return teacher.subjects.map(s => s.name).join(', ');
    }
}
