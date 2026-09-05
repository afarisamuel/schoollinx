import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Grade } from '../../../core/domain/grade.model';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';

@Component({
    selector: 'app-grade-form',
    imports: [ReactiveFormsModule, RouterLink, CommonModule],
    templateUrl: './grade-form.component.html',
    styleUrl: './grade-form.component.css',
    standalone: true
})
export class GradeFormComponent implements OnInit {
    gradeForm!: FormGroup;
    isEditMode = false;
    gradeId: string | null = null;
    studentId: string | null = null;
    studentName = '';
    className = '';
    isSubmitting = false;
    activePeriod: AcademicPeriod | null = null;
    terms: string[] = [];
    classes: Class[] = [];
    subjects: Subject[] = [];

    private fb = inject(FormBuilder);
    private gradeService = inject(GradeService);
    private studentService = inject(StudentService);
    private apService = inject(AcademicPeriodService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    ngOnInit(): void {
        this.initForm();
        this.loadClassesAndSubjects();
        this.loadActivePeriod();

        this.route.paramMap.subscribe(params => {
            const gId = params.get('id');
            const sId = params.get('studentId');

            if (sId) {
                this.studentId = sId;
                this.gradeForm.get('student_id')?.setValue(this.studentId);
                this.loadStudent(sId);
            }

            if (gId) {
                this.isEditMode = true;
                this.gradeId = gId;
                this.loadGradeData(this.gradeId);
            }
        });
    }

    loadClassesAndSubjects() {
        this.classService.getClasses().subscribe(cls => this.classes = cls || []);
        this.subjectService.getSubjects().subscribe(subs => this.subjects = subs || []);
    }

    initForm() {
        this.gradeForm = this.fb.group({
            student_id: ['', Validators.required],
            class_id: ['', Validators.required],
            score: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
            term: ['', Validators.required],
            subject: ['', Validators.required],
            category: ['ASSIGNMENT', Validators.required],
            max_score: [100, Validators.required],
            remarks: ['']
        });
    }

    loadActivePeriod() {
        this.apService.getActive().subscribe(period => {
            if (period) {
                this.activePeriod = period;
                if (period.terms && period.terms.length > 0) {
                    this.terms = period.terms.map(t => t.name);
                    const currentTerm = period.terms.find(t => t.term_number === period.current_term);
                    if (currentTerm && !this.gradeForm.get('term')?.value) {
                        this.gradeForm.get('term')?.setValue(currentTerm.name);
                    }
                } else {
                    this.terms = Array.from({ length: period.term_count || 3 }, (_, i) => `${period.term_type || 'Term'} ${i + 1}`);
                }
            }
        });
    }

    get studentForm() { return this.gradeForm.controls; }

    loadStudent(id: string) {
        this.studentService.getStudent(id).subscribe(s => {
            if (s) {
                this.studentName = `${s.first_name} ${s.last_name}`;
                if (s.class_id && !this.gradeForm.get('class_id')?.value) {
                    this.gradeForm.get('class_id')?.setValue(s.class_id);
                }
            }
        });
    }

    loadGradeData(id: string) {
        this.gradeService.getGrade(id).subscribe(grade => {
            if (grade) {
                this.gradeForm.patchValue(grade);
                if (!this.studentId) {
                    this.studentId = grade.student_id;
                    this.loadStudent(grade.student_id);
                }
            }
        });
    }

    onSubmit() {
        if (this.gradeForm.invalid) {
            this.gradeForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        const formData = this.gradeForm.value as Grade;
        formData.score = Number(formData.score);

        if (this.isEditMode && this.gradeId) {
            this.gradeService.updateGrade(this.gradeId, formData).subscribe({
                next: () => {
                    this.router.navigate(['/students', this.studentId, 'grades']);
                },
                error: () => {
                    this.isSubmitting = false;
                }
            });
        } else {
            this.gradeService.addGrade(formData).subscribe({
                next: () => {
                    this.router.navigate(['/students', this.studentId, 'grades']);
                },
                error: () => {
                    this.isSubmitting = false;
                }
            });
        }
    }
}
