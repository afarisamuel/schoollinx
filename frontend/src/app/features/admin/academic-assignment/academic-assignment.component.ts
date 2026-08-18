import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
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
    academicYear = '2023/2024';

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

    loadAssignments() {
        if (this.selectedClassId) {
            this.curriculumService.getAssignmentsByClass(this.selectedClassId).subscribe(data => {
                const filteredData = data.filter(assignment => assignment.class_id === this.selectedClassId);
                this.assignments.set(filteredData);
            });
            this.loadLocks(this.selectedClassId);
        } else {
            this.assignments.set([]);
            this.locks.set([]);
        }
    }

    loadLocks(classId: string) {
        this.classService.getClassLocks(classId).subscribe(data => {
            this.locks.set(data);
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
        this.classService.upsertClassLock(this.selectedClassId, newLock).subscribe(() => {
            this.loadLocks(this.selectedClassId!);
        });
    }

    getLockStatus(term: string): boolean {
        const lock = this.locks().find(l => l.term === term);
        return lock ? lock.is_locked : false;
    }

    createAssignment(event: any) {
        event.preventDefault();
        if (!this.selectedClassId) return;

        const formData = new FormData(event.target);
        const assignment = {
            teacher_id: formData.get('teacher_id') as string,
            class_id: this.selectedClassId,
            subject_id: formData.get('subject_id') as string,
            academic_year: this.academicYear
        };

        this.curriculumService.assignTeacher(assignment).subscribe(() => {
            this.loadAssignments();
        });
    }

    removeAssignment(id: string) {
        this.dialog.confirm('Decommissioning this instructional assignment will remove the teacher from this subject/class pairing. Proceed?', 'Remove Assignment', 'warning', 'Remove').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.curriculumService.removeAssignment(id).subscribe(() => {
                    this.loadAssignments();
                });
            }
        });
    }

    formatTeacherSubjects(teacher: Teacher): string {
        if (!teacher.subjects || teacher.subjects.length === 0) return 'No Specialization';
        return teacher.subjects.map(s => s.name).join(', ');
    }
}
