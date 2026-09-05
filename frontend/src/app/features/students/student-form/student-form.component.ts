import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { DocumentService } from '../../../core/infrastructure/document/document.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { CommonModule } from '@angular/common';
import { StudentIdCardComponent } from '../../../shared/ui/student-id-card/student-id-card.component';

@Component({
    selector: 'app-student-form',
    imports: [ReactiveFormsModule, FormsModule, RouterLink, CommonModule, StudentIdCardComponent],
    templateUrl: './student-form.component.html',
    styleUrl: './student-form.component.css',
    standalone: true
})
export class StudentFormComponent implements OnInit {
    studentForm!: FormGroup;
    isEditMode = false;
    studentId: string | null = null;
    isSubmitting = signal(false);
    successMessage = signal('');
    errorMessage = signal('');
    
    selectedFile: File | null = null;
    photoPreviewUrl = signal<string | null>(null);
    classes = signal<Class[]>([]);
    scholasticLevels = signal<ScholasticLevel[]>([]);

    // Active Section / Tab for Navigation
    activeSection = signal<'identity' | 'academic' | 'family' | 'health'>('identity');

    // Live Preview Signals
    previewFirstName = signal<string>('');
    previewLastName = signal<string>('');
    previewOtherName = signal<string>('');
    previewGender = signal<string>('');
    previewDob = signal<string>('');
    previewPhone = signal<string>('');
    previewAddress = signal<string>('');
    previewLevel = signal<number | null>(null);
    previewClassId = signal<string | null>(null);
    previewResidenceType = signal<string>('Day');
    previewFatherName = signal<string>('');
    previewFatherPhone = signal<string>('');
    previewMotherName = signal<string>('');
    previewMotherPhone = signal<string>('');
    previewGuardianName = signal<string>('');
    previewGuardianPhone = signal<string>('');
    previewGuardianRelation = signal<string>('Parent');
    previewBloodGroup = signal<string>('');
    previewEmergencyName = signal<string>('');
    previewEmergencyPhone = signal<string>('');
    previewAllergies = signal<string>('');
    previewHealthConditions = signal<string>('');

    // Predefined Blood Groups
    bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    // Common Allergy Quick Picks
    commonAllergies = ['Peanuts', 'Dust & Pollen', 'Penicillin', 'Lactose', 'Seafood', 'Asthma'];

    // Computed Properties
    studentFullName = computed(() => {
        const fn = this.previewFirstName().trim();
        const mn = this.previewOtherName().trim();
        const ln = this.previewLastName().trim();
        const parts = [fn, mn, ln].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'New Candidate';
    });

    studentInitials = computed(() => {
        const fn = this.previewFirstName().trim();
        const ln = this.previewLastName().trim();
        const f = fn ? fn[0].toUpperCase() : '';
        const l = ln ? ln[0].toUpperCase() : '';
        return (f + l) || 'ST';
    });

    selectedClassName = computed(() => {
        const classId = this.previewClassId();
        if (!classId) return 'Unassigned Class';
        const found = this.classes().find(c => c.id === classId);
        return found ? found.name : 'Unassigned Class';
    });

    selectedLevelName = computed(() => {
        const lvl = this.previewLevel();
        if (lvl === null || lvl === undefined) return 'No Level Selected';
        const found = this.scholasticLevels().find(l => l.ordinal === lvl);
        return found ? found.name : `Level ${lvl}`;
    });

    calculatedAge = computed(() => {
        const dobStr = this.previewDob();
        if (!dobStr) return null;
        const dob = new Date(dobStr);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    });

    // Form Completion Checklist & Percentage
    hasIdentityComplete = computed(() => {
        return !!(this.previewFirstName().trim() && this.previewLastName().trim() && this.previewGender() && this.previewDob());
    });

    hasAcademicComplete = computed(() => {
        return this.previewLevel() !== null;
    });

    hasFamilyComplete = computed(() => {
        return !!(this.previewFatherName().trim() || this.previewMotherName().trim() || this.previewGuardianName().trim());
    });

    hasHealthComplete = computed(() => {
        return !!(this.previewBloodGroup() || this.previewEmergencyName().trim() || this.previewEmergencyPhone().trim());
    });

    completionPercentage = computed(() => {
        let score = 0;
        if (this.previewFirstName().trim()) score += 15;
        if (this.previewLastName().trim()) score += 15;
        if (this.previewGender()) score += 10;
        if (this.previewDob()) score += 10;
        if (this.previewLevel() !== null) score += 20;
        if (this.previewClassId()) score += 10;
        if (this.previewFatherName().trim() || this.previewMotherName().trim() || this.previewGuardianName().trim()) score += 10;
        if (this.previewBloodGroup() || this.previewEmergencyName().trim()) score += 10;
        return Math.min(100, score);
    });

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
        this.classService.getClasses().subscribe({
            next: (data) => this.classes.set(data || []),
            error: () => this.classes.set([])
        });
    }

    loadScholasticLevels() {
        this.slService.getAll().subscribe({
            next: (data) => this.scholasticLevels.set(data || []),
            error: () => this.scholasticLevels.set([])
        });
    }

    initForm() {
        this.studentForm = this.fb.group({
            // Core Identity
            first_name: ['', Validators.required],
            last_name: ['', Validators.required],
            other_name: [''],
            gender: ['', Validators.required],
            dob: ['', Validators.required],
            phone_number: [''],
            address: [''],

            // Academic Placement
            exam_year: [new Date().getFullYear(), Validators.required],
            level: [null, Validators.required],
            class_id: [null],
            placed_residence_type: ['Day'],

            // Family Contacts
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

            // Health & Emergency
            emergency_contact_name: [''],
            emergency_contact_phone: [''],
            blood_group: [''],
            allergies: [''],
            health_conditions: ['']
        });

        // Sync form values with live preview signals
        this.studentForm.valueChanges.subscribe(val => {
            if (val) {
                this.previewFirstName.set(val.first_name || '');
                this.previewLastName.set(val.last_name || '');
                this.previewOtherName.set(val.other_name || '');
                this.previewGender.set(val.gender || '');
                this.previewDob.set(val.dob || '');
                this.previewPhone.set(val.phone_number || '');
                this.previewAddress.set(val.address || '');
                this.previewLevel.set(val.level !== undefined ? val.level : null);
                this.previewClassId.set(val.class_id || null);
                this.previewResidenceType.set(val.placed_residence_type || 'Day');
                this.previewFatherName.set(val.father_name || '');
                this.previewFatherPhone.set(val.father_phone || '');
                this.previewMotherName.set(val.mother_name || '');
                this.previewMotherPhone.set(val.mother_phone || '');
                this.previewGuardianName.set(val.guardian_name || '');
                this.previewGuardianPhone.set(val.guardian_phone || '');
                this.previewGuardianRelation.set(val.guardian_relation || 'Parent');
                this.previewBloodGroup.set(val.blood_group || '');
                this.previewEmergencyName.set(val.emergency_contact_name || '');
                this.previewEmergencyPhone.set(val.emergency_contact_phone || '');
                this.previewAllergies.set(val.allergies || '');
                this.previewHealthConditions.set(val.health_conditions || '');
            }
        });
    }

    get f() { return this.studentForm.controls; }

    loadStudentData(id: string) {
        this.studentService.getStudent(id).subscribe({
            next: (student) => {
                if (student) {
                    const formData: any = { ...student };
                    
                    if (student.guardians && student.guardians.length > 0) {
                        const g = student.guardians[0];
                        formData.guardian_name = [g.first_name, g.last_name].filter(Boolean).join(' ');
                        formData.guardian_phone = g.phone_number;
                        formData.guardian_email = g.email;
                        formData.guardian_relation = g.relationship;
                    }
                    
                    this.studentForm.patchValue(formData);
                    if (student.photo_url) {
                        this.photoPreviewUrl.set(student.photo_url);
                    }
                }
            },
            error: (err) => {
                this.errorMessage.set('Failed to load candidate record.');
            }
        });
    }

    // Helper selection methods for quick buttons
    setGender(gender: 'male' | 'female') {
        this.studentForm.patchValue({ gender });
        this.studentForm.get('gender')?.markAsDirty();
    }

    setResidenceType(type: 'Day' | 'Boarding') {
        this.studentForm.patchValue({ placed_residence_type: type });
        this.studentForm.get('placed_residence_type')?.markAsDirty();
    }

    setBloodGroup(bg: string) {
        const current = this.studentForm.get('blood_group')?.value;
        const nextVal = current === bg ? '' : bg;
        this.studentForm.patchValue({ blood_group: nextVal });
        this.studentForm.get('blood_group')?.markAsDirty();
    }

    toggleAllergy(allergy: string) {
        const current = this.studentForm.get('allergies')?.value || '';
        const list = current ? current.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const index = list.indexOf(allergy);
        if (index > -1) {
            list.splice(index, 1);
        } else {
            list.push(allergy);
        }
        this.studentForm.patchValue({ allergies: list.join(', ') });
        this.studentForm.get('allergies')?.markAsDirty();
    }

    isAllergySelected(allergy: string): boolean {
        const current = this.previewAllergies();
        if (!current) return false;
        return current.split(',').map(s => s.trim().toLowerCase()).includes(allergy.toLowerCase());
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.photoPreviewUrl.set(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    removePhoto() {
        this.selectedFile = null;
        this.photoPreviewUrl.set(null);
    }

    // Quick fill helper for Emergency Contact from Father or Mother
    copyFromFather() {
        const name = this.studentForm.get('father_name')?.value;
        const phone = this.studentForm.get('father_phone')?.value;
        if (name || phone) {
            this.studentForm.patchValue({
                emergency_contact_name: name,
                emergency_contact_phone: phone
            });
        }
    }

    copyFromMother() {
        const name = this.studentForm.get('mother_name')?.value;
        const phone = this.studentForm.get('mother_phone')?.value;
        if (name || phone) {
            this.studentForm.patchValue({
                emergency_contact_name: name,
                emergency_contact_phone: phone
            });
        }
    }

    onSubmit() {
        if (this.studentForm.invalid) {
            this.studentForm.markAllAsTouched();
            this.errorMessage.set('Please fill in all mandatory fields before submitting.');
            setTimeout(() => this.errorMessage.set(''), 4000);
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');
        const formData = { ...this.studentForm.value };

        // Map flat guardian fields to nested guardians array
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
                                error: () => { 
                                    this.isSubmitting.set(false);
                                    this.router.navigate(finalRoute);
                                }
                            });
                        },
                        error: () => {
                            this.isSubmitting.set(false);
                            this.router.navigate(finalRoute);
                        }
                    });
                } else {
                    this.router.navigate(finalRoute);
                }
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.errorMessage.set(err?.error?.error || 'An error occurred while saving the candidate record.');
                setTimeout(() => this.errorMessage.set(''), 5000);
            }
        });
    }
}
