import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Teacher, TeacherClassAssignment } from '../../../core/domain/teacher.model';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';

@Component({
    selector: 'app-teacher-form',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './teacher-form.component.html',
    styleUrl: './teacher-form.component.css',
    standalone: true
})
export class TeacherFormComponent implements OnInit {
    teacherForm!: FormGroup;
    isEditMode = false;
    teacherId: string | null = null;
    isSubmitting = signal(false);
    successMessage = signal('');
    errorMessage = signal('');
    availableSubjects = signal<Subject[]>([]);
    availableClasses = signal<Class[]>([]);
    assignments = signal<TeacherClassAssignment[]>([]);
    /** 'class' = Class Teacher (all subjects), 'subject' = Subject Teacher (one subject) */
    assignmentType = signal<'class' | 'subject'>('subject');

    constructor(
        private fb: FormBuilder,
        private teacherService: TeacherService,
        private subjectService: SubjectService,
        private classService: ClassService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadSubjects();
        this.loadClasses();

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode = true;
                this.teacherId = id;
                this.loadTeacherData(this.teacherId);
                this.loadAssignments(this.teacherId);
            }
        });
    }

    loadSubjects() {
        this.subjectService.getSubjects().subscribe(data => {
            this.availableSubjects.set(data);
        });
    }

    loadClasses() {
        this.classService.getClasses().subscribe(data => {
            this.availableClasses.set(data);
        });
    }

    loadAssignments(id: string) {
        this.teacherService.getAssignments(id).subscribe(data => {
            this.assignments.set(data);
        });
    }

    initForm() {
        this.teacherForm = this.fb.group({
            // Core Identity
            first_name: ['', Validators.required],
            last_name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone_number: [''],
            dob: ['', Validators.required],
            // Academic 
            subjects: [[]], // Optional: store as array of subject objects or IDs
            current_assignment: this.fb.group({
                class_id: [''],
                subject_id: [''],
                academic_year: ['2023/2024']
            })
        });
    }

    get f() { return this.teacherForm.controls; }

    loadTeacherData(id: string) {
        this.teacherService.getTeacher(id).subscribe(teacher => {
            if (teacher) {
                // Map subjects to just names or IDs for the select if needed, 
                // but let's assume the multi-select handles objects.
                this.teacherForm.patchValue(teacher);
            }
        });
    }

    addAssignment() {
        const assignmentVal = this.teacherForm.get('current_assignment')?.value;
        if (!assignmentVal.class_id || !this.teacherId) return;

        const isClassTeacher = this.assignmentType() === 'class';
        const payload = {
            teacher_id: this.teacherId,
            class_id: assignmentVal.class_id,
            subject_id: isClassTeacher ? null : (assignmentVal.subject_id || null),
            academic_year: assignmentVal.academic_year
        };

        this.teacherService.assignToClass(payload).subscribe(() => {
            if (this.teacherId) this.loadAssignments(this.teacherId);
            this.teacherForm.get('current_assignment')?.patchValue({
                class_id: '',
                subject_id: ''
            });
        });
    }

    removeAssignment(id: string) {
        this.teacherService.unassignFromClass(id).subscribe(() => {
            if (this.teacherId) this.loadAssignments(this.teacherId);
        });
    }

    onSubmit() {
        if (this.teacherForm.invalid) {
            this.teacherForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.successMessage.set('');
        this.errorMessage.set('');
        const formValue = this.teacherForm.value;
        
        // Prepare Teacher object
        // Note: subjects should be objects in the backend model
        const teacherData: any = {
            ...formValue,
            subjects: formValue.subjects.map((s: any) => (typeof s === 'string' ? { id: s } : s))
        };

        const operation = this.isEditMode && this.teacherId
            ? this.teacherService.updateTeacher(this.teacherId, teacherData)
            : this.teacherService.createTeacher(teacherData);

        operation.subscribe({
            next: (res: any) => {
                if (!this.isEditMode) {
                    this.router.navigate(['/teachers']);
                } else {
                    this.isSubmitting.set(false);
                    this.successMessage.set('Teacher information updated successfully.');
                }
            },
            error: (err) => { 
                this.isSubmitting.set(false); 
                this.errorMessage.set(err?.error?.error || 'An error occurred while saving the teacher.');
            }
        });
    }
}
