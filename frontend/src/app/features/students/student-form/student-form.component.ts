import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { DocumentService } from '../../../core/infrastructure/document/document.service';
import { signal } from '@angular/core';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-student-form',
    imports: [ReactiveFormsModule, RouterLink, CommonModule],
    templateUrl: './student-form.component.html',
    styleUrl: './student-form.component.css',
    standalone: true
})
export class StudentFormComponent implements OnInit {
    studentForm!: FormGroup;
    isEditMode = false;
    studentId: string | null = null;
    isSubmitting = false;
    selectedFile: File | null = null;
    photoPreviewUrl: string | null = null;
    classes = signal<Class[]>([]);
    scholasticLevels = signal<ScholasticLevel[]>([]);

    constructor(
        private fb: FormBuilder,
        private studentService: StudentService,
        private classService: ClassService,
        private slService: ScholasticLevelService,
        private documentService: DocumentService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadClasses();
        this.loadScholasticLevels();

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode = true;
                this.studentId = id;
                this.loadStudentData(this.studentId);
            }
        });
    }

    loadClasses() {
        this.classService.getClasses().subscribe(data => {
            this.classes.set(data);
        });
    }

    loadScholasticLevels() {
        this.slService.getAll().subscribe((data) => {
            this.scholasticLevels.set(data);
        });
    }

    initForm() {
        this.studentForm = this.fb.group({
            // Core Identity
            first_name:     ['', Validators.required],
            last_name:      ['', Validators.required],
            other_name:     [''],
            gender:         ['', Validators.required],
            dob:            ['', Validators.required],
            phone_number:   [''],

            // Academic Origin
            exam_year:      [new Date().getFullYear(), Validators.required],

            // Exam Results
            aggregate:      [null],
            raw_score:      [null],

            // Placement Details
            placed_residence_type:  [''],

            // System Associations (Optional)
            class_id: [null],
            level: [null, Validators.required],

            // Optional extras
            address: [''],

            // Family & Health
            father_name: [''],
            father_phone: [''],
            father_email: [''],
            father_occupation: [''],
            mother_name: [''],
            mother_phone: [''],
            mother_email: [''],
            mother_occupation: [''],
            guardian_name: [''],
            guardian_phone: [''],
            guardian_email: ['', Validators.email],
            guardian_relation: ['Parent'],
            emergency_contact_name: [''],
            emergency_contact_phone: [''],
            health_conditions: [''],
            allergies: [''],
            blood_group: [''],
        });
    }

    get f() { return this.studentForm.controls; }

    loadStudentData(id: string) {
        this.studentService.getStudent(id).subscribe(student => {
            if (student) {
                const formData: any = { ...student };
                
                if (student.guardians && student.guardians.length > 0) {
                    const g = student.guardians[0];
                    formData.guardian_name = g.first_name + ' ' + g.last_name;
                    formData.guardian_phone = g.phone_number;
                    formData.guardian_email = g.email;
                    formData.guardian_relation = g.relationship;
                }
                
                this.studentForm.patchValue(formData);
                if (student.photo_url) {
                    this.photoPreviewUrl = student.photo_url;
                }
            }
        });
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.photoPreviewUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    onSubmit() {
        if (this.studentForm.invalid) {
            this.studentForm.markAllAsTouched();
            return;
        }
        this.isSubmitting = true;
        const formData = { ...this.studentForm.value };

        // Map flat guardian fields to nested guardians array.
        // Only include the guardians array if at least one contact field is filled in.
        // This avoids sending an empty guardian stub on update when no guardian is being added.
        const guardianPhone = formData.guardian_phone;
        const guardianEmail = formData.guardian_email;
        const guardianName = formData.guardian_name;
        const guardianRelation = formData.guardian_relation;

        delete formData.guardian_name;
        delete formData.guardian_phone;
        delete formData.guardian_email;
        delete formData.guardian_relation;

        if (guardianPhone || guardianEmail || guardianName) {
            let fn = guardianName || '';
            let ln = '';
            const parts = fn.split(' ');
            if (parts.length > 1) {
                ln = parts.pop() || '';
                fn = parts.join(' ');
            }
            formData.guardians = [{
                first_name: fn,
                last_name: ln,
                phone_number: guardianPhone,
                email: guardianEmail,
                relationship: guardianRelation || 'Guardian',
            }];
        }

        const operation = this.isEditMode && this.studentId
            ? this.studentService.updateStudent(this.studentId, formData as Student)
            : this.studentService.createStudent(formData as Student);

        const returnRoute = this.isEditMode && this.studentId
            ? ['/students/details', this.studentId]
            : ['/students'];

        operation.subscribe({
            next: (savedStudent: any) => {
                const targetId = savedStudent?.id || this.studentId;
                const finalRoute = this.isEditMode && targetId ? ['/students/details', targetId] : returnRoute;

                if (this.selectedFile && targetId) {
                    this.documentService.upload(this.selectedFile, {
                        owner_id: targetId,
                        owner_type: 'STUDENT',
                        category: 'IDENTITY'
                    }).subscribe({
                        next: (doc) => {
                            savedStudent.photo_url = `/api/documents/${doc.id}/download`;
                            this.studentService.updateStudent(targetId, savedStudent).subscribe({
                                next: () => this.router.navigate(finalRoute),
                                error: () => { this.isSubmitting = false; }
                            });
                        },
                        error: () => {
                            this.isSubmitting = false;
                            this.router.navigate(finalRoute);
                        }
                    });
                } else {
                    this.router.navigate(finalRoute);
                }
            },
            error: () => { this.isSubmitting = false; }
        });
    }
}
