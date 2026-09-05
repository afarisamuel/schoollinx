import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';

export interface AdmissionCustomField {
  id: string;
  title: string;
  section: 'biodata' | 'academic' | 'guardian' | 'medical' | 'custom';
  value?: string;
  lineType: 'single' | 'double' | 'checkboxes';
  options?: string[];
  span: 'full' | 'half' | 'third';
}

export interface CustomFieldPreset {
  title: string;
  section: 'biodata' | 'academic' | 'guardian' | 'medical' | 'custom';
  lineType: 'single' | 'double' | 'checkboxes';
  options?: string[];
  span: 'full' | 'half' | 'third';
  icon: string;
}

@Component({
  selector: 'app-admission-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admission-form.component.html',
  styleUrl: './admission-form.component.css'
})
export class AdmissionFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentService = inject(StudentService);
  private tenantProfileService = inject(TenantProfileService);
  private classService = inject(ClassService);
  private slService = inject(ScholasticLevelService);

  studentId = signal<string | null>(null);
  student = signal<Student | null>(null);
  tenantProfile = signal<TenantProfile | null>(null);
  classes = signal<Class[]>([]);
  scholasticLevels = signal<ScholasticLevel[]>([]);
  isLoading = signal(true);

  // Print Mode Options
  isFormBlank = signal(false);
  includeMedical = signal(true);
  includeChecklist = signal(true);
  includeDeclaration = signal(true);
  academicYear = signal('2026/2027');
  admissionDate = signal(new Date());

  // Custom Dynamic Fields System
  isCustomizerOpen = signal(false);
  customFields = signal<AdmissionCustomField[]>([]);

  // New Custom Field Form State
  newFieldTitle = signal('');
  newFieldSection = signal<'biodata' | 'academic' | 'guardian' | 'medical' | 'custom'>('custom');
  newFieldLineType = signal<'single' | 'double' | 'checkboxes'>('single');
  newFieldSpan = signal<'full' | 'half' | 'third'>('half');
  newFieldOptionsText = signal('Yes, No');

  // Preset Template Chips
  presetTemplates: CustomFieldPreset[] = [
    { title: 'Mother Tongue / Native Dialect', section: 'biodata', lineType: 'single', span: 'half', icon: 'fas fa-language' },
    { title: 'Hometown & Region of Origin', section: 'biodata', lineType: 'single', span: 'half', icon: 'fas fa-map-pin' },
    { title: 'Denominational Parish / Local Mosque', section: 'biodata', lineType: 'single', span: 'half', icon: 'fas fa-place-of-worship' },
    { title: 'Transportation Zone / Bus Route', section: 'academic', lineType: 'single', span: 'half', icon: 'fas fa-bus' },
    { title: 'Sibling(s) Currently Enrolled in School', section: 'academic', lineType: 'single', span: 'full', icon: 'fas fa-user-group' },
    { title: 'House / Dormitory Preference', section: 'academic', lineType: 'single', span: 'half', icon: 'fas fa-bed' },
    { title: 'Sports, Music & Extracurricular Talents', section: 'academic', lineType: 'double', span: 'full', icon: 'fas fa-trophy' },
    { title: 'Scholarship / Educational Sponsor Particulars', section: 'guardian', lineType: 'double', span: 'full', icon: 'fas fa-hand-holding-dollar' },
    { title: 'Special Dietary Needs & Restrictions', section: 'medical', lineType: 'double', span: 'full', icon: 'fas fa-utensils' },
    { title: 'Special Educational Needs / Learning Accommodations', section: 'medical', lineType: 'double', span: 'full', icon: 'fas fa-hands-holding-child' },
  ];

  // Filtered Custom Fields by Section
  biodataCustomFields = computed(() => this.customFields().filter(f => f.section === 'biodata'));
  academicCustomFields = computed(() => this.customFields().filter(f => f.section === 'academic'));
  guardianCustomFields = computed(() => this.customFields().filter(f => f.section === 'guardian'));
  medicalCustomFields = computed(() => this.customFields().filter(f => f.section === 'medical'));
  standaloneCustomFields = computed(() => this.customFields().filter(f => f.section === 'custom'));

  // Computed Properties
  candidateFullName = computed(() => {
    if (this.isFormBlank()) return '';
    const s = this.student();
    if (!s) return '';
    return [s.first_name, s.other_name, s.last_name].filter(Boolean).join(' ').toUpperCase();
  });

  candidateInitials = computed(() => {
    const s = this.student();
    if (!s) return 'ST';
    const f = s.first_name ? s.first_name[0] : '';
    const l = s.last_name ? s.last_name[0] : '';
    return (f + l).toUpperCase() || 'ST';
  });

  candidateAge = computed(() => {
    if (this.isFormBlank()) return null;
    const s = this.student();
    if (!s || !s.dob) return null;
    const dob = new Date(s.dob);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  });

  candidateClassName = computed(() => {
    if (this.isFormBlank()) return '';
    const s = this.student();
    if (!s || !s.class_id) return s?.class_name || '';
    const found = this.classes().find(c => c.id === s.class_id);
    return found ? found.name : s.class_name || '';
  });

  candidateLevelName = computed(() => {
    if (this.isFormBlank()) return '';
    const s = this.student();
    if (!s || s.level === undefined || s.level === null) return '';
    const found = this.scholasticLevels().find(l => l.ordinal === s.level);
    return found ? found.name : `Level ${s.level}`;
  });

  primaryGuardian = computed(() => {
    if (this.isFormBlank()) return null;
    const s = this.student();
    if (!s) return null;
    if (s.guardians && s.guardians.length > 0) {
      return s.guardians[0];
    }
    if (s.guardian_name || s.guardian_phone) {
      return {
        first_name: s.guardian_name || '',
        last_name: '',
        phone_number: s.guardian_phone || '',
        email: s.guardian_email || '',
        relationship: s.guardian_relation || 'Guardian'
      };
    }
    return null;
  });

  referenceNumber = computed(() => {
    const id = this.studentId();
    if (id && !this.isFormBlank()) {
      return `ADM-${id.substring(0, 8).toUpperCase()}-2026`;
    }
    return 'ADM-_______________';
  });

  ngOnInit(): void {
    this.loadMetadata();
    this.loadPersistedCustomFields();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.studentId.set(id);
        this.loadStudent(id);
      } else {
        // Query param check (e.g. ?blank=true)
        this.route.queryParamMap.subscribe(q => {
          if (q.get('blank') === 'true') {
            this.isFormBlank.set(true);
          }
          this.isLoading.set(false);
        });
      }
    });
  }

  loadMetadata() {
    this.tenantProfileService.getProfile().subscribe({
      next: (profile) => this.tenantProfile.set(profile),
      error: () => {}
    });

    this.classService.getClasses().subscribe({
      next: (data) => this.classes.set(data || []),
      error: () => {}
    });

    this.slService.getAll().subscribe({
      next: (data) => this.scholasticLevels.set(data || []),
      error: () => {}
    });
  }

  loadStudent(id: string) {
    this.isLoading.set(true);
    this.studentService.getStudent(id).subscribe({
      next: (data) => {
        this.student.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  // --- Custom Field Operations ---

  loadPersistedCustomFields() {
    try {
      const saved = localStorage.getItem('schoollinx_admission_custom_fields');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.customFields.set(parsed);
        }
      }
    } catch {
      // Fallback
    }
  }

  saveCustomFieldsToStorage() {
    try {
      localStorage.setItem('schoollinx_admission_custom_fields', JSON.stringify(this.customFields()));
    } catch {
      // Ignore
    }
  }

  toggleCustomizer() {
    this.isCustomizerOpen.update(v => !v);
  }

  addCustomField() {
    const title = this.newFieldTitle().trim();
    if (!title) return;

    let options: string[] | undefined = undefined;
    if (this.newFieldLineType() === 'checkboxes') {
      options = this.newFieldOptionsText()
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      if (options.length === 0) options = ['Yes', 'No'];
    }

    const newField: AdmissionCustomField = {
      id: 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title,
      section: this.newFieldSection(),
      lineType: this.newFieldLineType(),
      span: this.newFieldSpan(),
      options: options,
      value: ''
    };

    this.customFields.update(list => [...list, newField]);
    this.saveCustomFieldsToStorage();

    // Reset input
    this.newFieldTitle.set('');
  }

  addPresetField(preset: CustomFieldPreset) {
    // Check if already exists with same title
    const exists = this.customFields().some(f => f.title.toLowerCase() === preset.title.toLowerCase());
    if (exists) return;

    const newField: AdmissionCustomField = {
      id: 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: preset.title,
      section: preset.section,
      lineType: preset.lineType,
      span: preset.span,
      options: preset.options,
      value: ''
    };

    this.customFields.update(list => [...list, newField]);
    this.saveCustomFieldsToStorage();
  }

  removeCustomField(id: string) {
    this.customFields.update(list => list.filter(f => f.id !== id));
    this.saveCustomFieldsToStorage();
  }

  clearAllCustomFields() {
    this.customFields.set([]);
    this.saveCustomFieldsToStorage();
  }

  updateCustomFieldValue(id: string, val: string) {
    this.customFields.update(list =>
      list.map(f => f.id === id ? { ...f, value: val } : f)
    );
  }

  toggleBlankMode(blank: boolean) {
    this.isFormBlank.set(blank);
  }

  printForm() {
    window.print();
  }

  goBack() {
    const id = this.studentId();
    if (id) {
      this.router.navigate(['/students/details', id]);
    } else {
      this.router.navigate(['/students']);
    }
  }
}
