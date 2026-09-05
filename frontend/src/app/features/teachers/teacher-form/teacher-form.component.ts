import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Teacher, TeacherClassAssignment } from '../../../core/domain/teacher.model';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';

@Component({
    selector: 'app-teacher-form',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
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

    // Catalog Data
    availableSubjects = signal<Subject[]>([]);
    availableClasses = signal<Class[]>([]);
    assignments = signal<TeacherClassAssignment[]>([]);

    // Subject Filter & Multi-Select State
    subjectSearch = signal<string>('');
    selectedSubjectIds = signal<string[]>([]);

    // Live Preview Signals
    previewFirstName = signal<string>('');
    previewLastName = signal<string>('');
    previewEmail = signal<string>('');
    previewPhone = signal<string>('');
    previewDob = signal<string>('');
    previewCanCollectFees = signal<boolean>(false);

    /** 'class' = Class Teacher (all subjects), 'subject' = Subject Teacher (one subject) */
    assignmentType = signal<'class' | 'subject'>('subject');

    // Filtered Subjects
    filteredSubjects = computed(() => {
        const query = this.subjectSearch().trim().toLowerCase();
        const subjects = this.availableSubjects();
        if (!query) return subjects;
        return subjects.filter(s =>
            s.name.toLowerCase().includes(query) ||
            (s.code && s.code.toLowerCase().includes(query))
        );
    });

    // Selected Subjects List Object
    selectedSubjectsList = computed(() => {
        const selectedIds = new Set(this.selectedSubjectIds());
        return this.availableSubjects().filter(s => selectedIds.has(s.id));
    });

    // Computed Initials
    educatorInitials = computed(() => {
        const f = this.previewFirstName().trim();
        const l = this.previewLastName().trim();
        const first = f ? f[0].toUpperCase() : '';
        const last = l ? l[0].toUpperCase() : '';
        return (first + last) || 'ED';
    });

    // Computed Full Name
    educatorFullName = computed(() => {
        const f = this.previewFirstName().trim();
        const l = this.previewLastName().trim();
        if (!f && !l) return 'New Educator';
        return `${f} ${l}`.trim();
    });

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
        this.subjectService.getSubjects().subscribe({
            next: (data) => this.availableSubjects.set(data || []),
            error: () => this.availableSubjects.set([])
        });
    }

    loadClasses() {
        this.classService.getClasses().subscribe({
            next: (data) => this.availableClasses.set(data || []),
            error: () => this.availableClasses.set([])
        });
    }

    loadAssignments(id: string) {
        this.teacherService.getAssignments(id).subscribe({
            next: (data) => this.assignments.set(data || []),
            error: () => this.assignments.set([])
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
            can_collect_fees: [false],
            // Academic Specialization
            subjects: [[]],
            current_assignment: this.fb.group({
                class_id: [''],
                subject_id: [''],
                academic_year: ['2026/2027']
            })
        });

        // Sync live preview signals
        this.teacherForm.valueChanges.subscribe(val => {
            if (val) {
                this.previewFirstName.set(val.first_name || '');
                this.previewLastName.set(val.last_name || '');
                this.previewEmail.set(val.email || '');
                this.previewPhone.set(val.phone_number || '');
                this.previewDob.set(val.dob || '');
                this.previewCanCollectFees.set(!!val.can_collect_fees);
            }
        });
    }

    get f() { return this.teacherForm.controls; }

    loadTeacherData(id: string) {
        this.teacherService.getTeacher(id).subscribe(teacher => {
            if (teacher) {
                const subjectIds = teacher.subjects ? teacher.subjects.map(s => s.id) : [];
                this.selectedSubjectIds.set(subjectIds);

                this.teacherForm.patchValue({
                    first_name: teacher.first_name,
                    last_name: teacher.last_name,
                    email: teacher.email,
                    phone_number: teacher.phone_number,
                    dob: teacher.dob,
                    can_collect_fees: teacher.can_collect_fees || false,
                    subjects: subjectIds
                });
            }
        });
    }

    // Interactive Subject Multi-Select Toggles
    isSubjectSelected(id: string): boolean {
        return this.selectedSubjectIds().includes(id);
    }

    toggleSubject(subject: Subject) {
        const current = [...this.selectedSubjectIds()];
        const index = current.indexOf(subject.id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(subject.id);
        }
        this.selectedSubjectIds.set(current);
        this.teacherForm.patchValue({ subjects: current });
        this.teacherForm.get('subjects')?.markAsDirty();
    }

    selectAllSubjects() {
        const allIds = this.availableSubjects().map(s => s.id);
        this.selectedSubjectIds.set(allIds);
        this.teacherForm.patchValue({ subjects: allIds });
        this.teacherForm.get('subjects')?.markAsDirty();
    }

    clearAllSubjects() {
        this.selectedSubjectIds.set([]);
        this.teacherForm.patchValue({ subjects: [] });
        this.teacherForm.get('subjects')?.markAsDirty();
    }

    addAssignment() {
        const assignmentVal = this.teacherForm.get('current_assignment')?.value;
        if (!assignmentVal.class_id || !this.teacherId) return;

        const isClassTeacher = this.assignmentType() === 'class';
        const payload = {
            teacher_id: this.teacherId,
            class_id: assignmentVal.class_id,
            subject_id: isClassTeacher ? null : (assignmentVal.subject_id || null),
            academic_year: assignmentVal.academic_year || '2026/2027'
        };

        this.teacherService.assignToClass(payload).subscribe({
            next: () => {
                if (this.teacherId) this.loadAssignments(this.teacherId);
                this.teacherForm.get('current_assignment')?.patchValue({
                    class_id: '',
                    subject_id: ''
                });
            },
            error: () => {}
        });
    }

    removeAssignment(id: string) {
        this.teacherService.unassignFromClass(id).subscribe({
            next: () => {
                if (this.teacherId) this.loadAssignments(this.teacherId);
            },
            error: () => {}
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

        // Prepare Teacher payload
        const subjectsPayload = this.selectedSubjectIds().map(id => ({ id }));
        const teacherData: any = {
            first_name: formValue.first_name,
            last_name: formValue.last_name,
            email: formValue.email,
            phone_number: formValue.phone_number,
            dob: formValue.dob,
            can_collect_fees: !!formValue.can_collect_fees,
            subjects: subjectsPayload
        };

        const operation = this.isEditMode && this.teacherId
            ? this.teacherService.updateTeacher(this.teacherId, teacherData)
            : this.teacherService.createTeacher(teacherData);

        operation.subscribe({
            next: () => {
                if (!this.isEditMode) {
                    this.router.navigate(['/teachers']);
                } else {
                    this.isSubmitting.set(false);
                    this.successMessage.set('Educator record updated successfully.');
                    setTimeout(() => this.successMessage.set(''), 4000);
                }
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.errorMessage.set(err?.error?.error || 'An error occurred while saving the educator record.');
                setTimeout(() => this.errorMessage.set(''), 5000);
            }
        });
    }
}
