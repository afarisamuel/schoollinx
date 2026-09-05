import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Student } from '../../../core/domain/student.model';
import { Grade, GradeWeight, GradeCategory } from '../../../core/domain/grade.model';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicTerm } from '../../../core/domain/academic-period.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { TeacherPortalService } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

export type GradingScaleType = 'STANDARD' | 'WAEC' | 'CAMBRIDGE' | 'GPA';
export type SpecialGradeFlag = 'ABS' | 'EX' | 'INC';

export interface GradeScaleBand {
  label: string;
  min: number;
  max: number;
  color: string;
  textColor: string;
  badgeClass: string;
  remark?: string;
}

export interface GradeScaleDefinition {
  id: GradingScaleType;
  name: string;
  description: string;
  bands: GradeScaleBand[];
}

@Component({
  selector: 'app-bulk-grading',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bulk-grading.component.html',
  styleUrl: './bulk-grading.component.css'
})
export class BulkGradingComponent implements OnInit {
  readonly Math = Math;
  private gradeService = inject(GradeService);
  private classService = inject(ClassService);
  private studentService = inject(StudentService);
  private subjectService = inject(SubjectService);
  private academicPeriodService = inject(AcademicPeriodService);
  private teacherPortalService = inject(TeacherPortalService);
  private authService = inject(AuthService);
  private dialog = inject(DialogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  classes = signal<Class[]>([]);
  subjects = signal<Subject[]>([]);
  students = signal<Student[]>([]);

  selectedClassId = signal('');
  selectedSubjectId = signal('');
  selectedTerm = signal('');
  terms = signal<AcademicTerm[]>([]);
  activePeriodId = signal('');
  activeTermId = signal('');

  // Teacher Profile & Assignments for Scoped Subject Access
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  currentClassSubjects = signal<Subject[]>([]);

  // Role permissions
  isHeadmasterOrAdmin = computed(() => {
    const role = (this.authService.currentUserValue?.role || '') as string;
    return role === 'ADMIN' || role === 'HEADMASTER' || role === 'ECOPOWER_ADMIN' || role === 'IT_ADMIN';
  });

  // Determines if logged-in teacher is the Form Master / Class Teacher for the selected class
  isClassTeacherForSelectedClass = computed(() => {
    if (this.isHeadmasterOrAdmin()) return true;
    const cId = this.selectedClassId();
    if (!cId) return false;
    const cls = this.classes().find(c => c.id === cId);
    const teacherId = this.teacher()?.id || this.authService.currentUserValue?.id;
    if (cls?.teacher_id && teacherId && cls.teacher_id === teacherId) return true;
    const isAssignedAsClassTeacher = this.assignments().some(a => a.class_id === cId && (!a.subject_id || a.subject_id === '00000000-0000-0000-0000-000000000000'));
    return isAssignedAsClassTeacher;
  });

  // Dynamic Subjects Filter:
  // - Admins/Headmasters & Class Teachers: Access ALL class subjects
  // - Subject Teachers: Restricted ONLY to subjects assigned to them for this specific class
  availableSubjects = computed(() => {
    const cId = this.selectedClassId();
    const allSubs = this.subjects();
    if (!cId) return allSubs;

    // If Admin/Headmaster or Class Teacher, show all subjects for that class
    if (this.isHeadmasterOrAdmin() || this.isClassTeacherForSelectedClass()) {
      const classSubs = this.currentClassSubjects();
      if (classSubs && classSubs.length > 0) {
        return classSubs;
      }
      return allSubs;
    }

    // Subject Teacher: Show only assigned subjects for this class
    const teacherClassAssignments = this.assignments().filter(a => a.class_id === cId);
    if (teacherClassAssignments.length === 0) {
      return [];
    }

    const assignedKeys = new Set<string>();
    teacherClassAssignments.forEach(a => {
      if (a.subject_id) assignedKeys.add(a.subject_id.toLowerCase());
      if (a.subject?.id) assignedKeys.add(a.subject.id.toLowerCase());
      if (a.subject?.name) assignedKeys.add(a.subject.name.trim().toLowerCase());
    });

    const filtered = allSubs.filter(s => 
      assignedKeys.has(s.id.toLowerCase()) || 
      assignedKeys.has(s.name.trim().toLowerCase()) ||
      (s.code && assignedKeys.has(s.code.trim().toLowerCase()))
    );

    if (filtered.length === 0) {
      const extracted: Subject[] = [];
      teacherClassAssignments.forEach(a => {
        if (a.subject) {
          extracted.push({
            id: a.subject.id,
            name: a.subject.name,
            code: a.subject.code || ''
          } as Subject);
        }
      });
      return extracted;
    }

    return filtered;
  });

  // Computed Telemetry
  selectedClassName = computed(() => {
    const c = this.classes().find(cls => cls.id === this.selectedClassId());
    return c ? c.name : 'No Class Selected';
  });

  selectedSubjectName = computed(() => {
    const current = this.selectedSubjectId();
    if (!current) return 'No Subject Selected';
    const s = this.subjects().find(sub => 
      sub.id === current || 
      sub.name.toLowerCase() === current.toLowerCase() || 
      (sub.code && sub.code.toLowerCase() === current.toLowerCase())
    );
    return s ? s.name : current;
  });

  gradedStudentsCount = computed(() => {
    return this.students().filter(s => this.getTotalPercentage(s.id!) !== '—').length;
  });

  completionPercentage = computed(() => {
    const total = this.students().length;
    if (!total) return 0;
    return Math.round((this.gradedStudentsCount() / total) * 100);
  });

  // Dynamic columns configured for this class
  configuredColumns = signal<GradeWeight[]>([]);

  // Configuration Mode State
  isConfigMode = signal(false);
  newColumnCategory = signal('');
  newColumnWeight = signal(0);

  // Map of studentId -> category -> { score: number | null, flag?: string, id?: string }
  draftGrades = signal<Map<string, { [category: string]: { score: number | null, flag?: string, id?: string } }>>(new Map());

  // Grading Scales
  selectedScale = signal<GradingScaleType>('STANDARD');

  readonly gradingScales: Record<GradingScaleType, GradeScaleDefinition> = {
    STANDARD: {
      id: 'STANDARD',
      name: 'Standard (A–F)',
      description: 'Standard 100-point letter grading system',
      bands: [
        { label: 'A', min: 80, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'C', min: 60, max: 69, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Good' },
        { label: 'D', min: 50, max: 59, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Pass' },
        { label: 'E', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Weak Pass' },
        { label: 'F', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Fail' }
      ]
    },
    WAEC: {
      id: 'WAEC',
      name: 'WAEC / BECE (A1–F9)',
      description: 'West African Examinations Council 9-point scale',
      bands: [
        { label: 'A1', min: 80, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B2', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'B3', min: 65, max: 69, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Good' },
        { label: 'C4', min: 60, max: 64, color: 'bg-blue-400', textColor: 'text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', remark: 'Credit' },
        { label: 'C5', min: 55, max: 59, color: 'bg-amber-400', textColor: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', remark: 'Credit' },
        { label: 'C6', min: 50, max: 54, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Credit' },
        { label: 'D7', min: 45, max: 49, color: 'bg-orange-400', textColor: 'text-orange-400', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20', remark: 'Pass' },
        { label: 'E8', min: 40, max: 44, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Pass' },
        { label: 'F9', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Fail' }
      ]
    },
    CAMBRIDGE: {
      id: 'CAMBRIDGE',
      name: 'Cambridge / IGCSE (A*–U)',
      description: 'International General Certificate of Secondary Education',
      bands: [
        { label: 'A*', min: 90, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Outstanding' },
        { label: 'A', min: 80, max: 89, color: 'bg-emerald-400', textColor: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'C', min: 60, max: 69, color: 'bg-blue-400', textColor: 'text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', remark: 'Good' },
        { label: 'D', min: 50, max: 59, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Satisfactory' },
        { label: 'E', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Acceptable' },
        { label: 'U', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Ungraded' }
      ]
    },
    GPA: {
      id: 'GPA',
      name: 'GPA (4.0 Scale)',
      description: 'Grade Point Average scale',
      bands: [
        { label: '4.0 (A)', min: 85, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Honors' },
        { label: '3.5 (B+)', min: 75, max: 84, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'High Pass' },
        { label: '3.0 (B)', min: 65, max: 74, color: 'bg-blue-400', textColor: 'text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20', remark: 'Above Average' },
        { label: '2.5 (C+)', min: 55, max: 64, color: 'bg-amber-400', textColor: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', remark: 'Average' },
        { label: '2.0 (C)', min: 50, max: 54, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Passing' },
        { label: '1.0 (D)', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Conditional' },
        { label: '0.0 (F)', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Failing' }
      ]
    }
  };

  // Autosave & Draft State
  hasUnsavedChanges = signal(false);
  hasRecoverableDraft = signal(false);
  draftSavedTime = signal<string>('');

  // Lock State
  isLocked = signal(false);
  gradeStatus = signal<'DRAFT' | 'SUBMITTED' | 'LOCKED'>('DRAFT');

  // Terminal Evaluation & Remarks Modal State
  evalStudent = signal<Student | null>(null);
  isEvalModalOpen = signal(false);
  isEvalLoading = signal(false);
  isEvalSaving = signal(false);
  evalData = signal<any>({});

  // Batch Tool State
  activeBatchColumn = signal<string>('');
  isBatchModalOpen = signal(false);
  batchActionType = signal<'fill' | 'curve'>('fill');
  batchValue = signal<number>(0);

  readonly headmasterTemplates = [
    'Promoted with Distinction. Outstanding academic capability and character.',
    'Promoted to next class. Very commendable performance, keep working hard.',
    'Promoted on trial. Needs focused attention and improvement in core subjects.',
    'Satisfactory performance. Capable of higher achievement with dedication.',
    'Shows consistent academic and disciplinary growth throughout the term.'
  ];

  isLoading = signal(false);
  isSaving = signal(false);

  ngOnInit() {
    // 1. Initial query parameter capture
    const initialParams = this.route.snapshot.queryParams;
    if (initialParams['class_id']) this.selectedClassId.set(initialParams['class_id']);
    if (initialParams['subject']) this.selectedSubjectId.set(initialParams['subject']);
    if (initialParams['term']) this.selectedTerm.set(initialParams['term']);
    if (initialParams['scale'] && (initialParams['scale'] === 'STANDARD' || initialParams['scale'] === 'WAEC' || initialParams['scale'] === 'CAMBRIDGE' || initialParams['scale'] === 'GPA')) {
      this.selectedScale.set(initialParams['scale']);
    }

    // 2. Fetch metadata
    this.loadTerms();
    this.loadTeacherAssignments();
    this.loadSubjects();
    this.loadClasses();

    // 3. Reactively handle URL query parameter updates (e.g. browser navigation, deep linking)
    this.route.queryParams.subscribe(params => {
      const qClass = params['class_id'];
      const qSub = params['subject'];
      const qTerm = params['term'];
      const qScale = params['scale'];

      let stateChanged = false;

      if (qScale && (qScale === 'STANDARD' || qScale === 'WAEC' || qScale === 'CAMBRIDGE' || qScale === 'GPA')) {
        if (qScale !== this.selectedScale()) {
          this.selectedScale.set(qScale);
        }
      }

      if (qClass && qClass !== this.selectedClassId()) {
        this.selectedClassId.set(qClass);
        this.loadClassSpecificSubjects(qClass);
        this.loadWeights();
        this.loadStudents();
        stateChanged = true;
      }

      if (qSub && qSub !== this.selectedSubjectId()) {
        this.selectedSubjectId.set(qSub);
        stateChanged = true;
      }

      if (qTerm && qTerm !== this.selectedTerm()) {
        this.selectedTerm.set(qTerm);
        const foundTerm = this.terms().find(t => t.name === qTerm || t.id === qTerm);
        if (foundTerm?.id) this.activeTermId.set(foundTerm.id);
        stateChanged = true;
      }

      if (stateChanged && this.selectedClassId() && this.selectedSubjectId()) {
        this.loadExistingGrades();
      }
    });
  }

  loadTeacherAssignments() {
    this.teacherPortalService.getMyClasses().subscribe({
      next: (resp) => {
        if (resp) {
          this.teacher.set(resp.teacher);
          this.assignments.set(resp.assignments || []);
          this.validateSubjectForCurrentClass();
        }
      },
      error: () => {
        // Fallback for non-teacher/admin sessions
      }
    });
  }

  loadClassSpecificSubjects(classId: string) {
    if (!classId) return;
    this.classService.getClassSubjects(classId).subscribe({
      next: (subs) => {
        if (subs && subs.length > 0) {
          this.currentClassSubjects.set(subs.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code || ''
          } as Subject)));
        } else {
          this.currentClassSubjects.set([]);
        }
        this.validateSubjectForCurrentClass();
      },
      error: () => {
        this.currentClassSubjects.set([]);
        this.validateSubjectForCurrentClass();
      }
    });
  }

  validateSubjectForCurrentClass() {
    const available = this.availableSubjects();
    if (available.length === 0 || this.subjects().length === 0) return;

    const currentSub = this.selectedSubjectId();
    if (!currentSub) {
      this.selectedSubjectId.set(available[0].name || available[0].id);
      this.syncUrlAndSession();
      if (this.selectedClassId()) {
        this.loadExistingGrades();
      }
      return;
    }

    const isCurrentValid = available.some(s => 
      s.id.toLowerCase() === currentSub.toLowerCase() || 
      s.name.trim().toLowerCase() === currentSub.trim().toLowerCase() || 
      (s.code && s.code.trim().toLowerCase() === currentSub.trim().toLowerCase())
    );

    if (!isCurrentValid && available.length > 0) {
      this.selectedSubjectId.set(available[0].name || available[0].id);
      this.syncUrlAndSession();
      if (this.selectedClassId()) {
        this.loadExistingGrades();
      }
    }
  }

  getStorageKey(): string {
    return `schoollinx_grades_draft_${this.selectedClassId()}_${this.selectedSubjectId()}_${this.selectedTerm()}`;
  }

  getDisplayWeight(weight: number): number {
    if (weight === null || weight === undefined) return 0;
    return weight > 1 ? Math.round(weight) : Math.round(weight * 100);
  }

  updateEvalField(field: string, value: any) {
    this.evalData.update(d => ({ ...d, [field]: value }));
  }

  loadTerms() {
    const savedTerm = this.route.snapshot.queryParams['term'] || this.selectedTerm() || sessionStorage.getItem('schoollinx_bulk_grade_term') || '';
    this.academicPeriodService.getActive().subscribe({
      next: (period) => {
        if (period && period.terms) {
          this.activePeriodId.set(period.id || '');
          this.terms.set(period.terms);
          
          if (savedTerm && period.terms.some(t => t.name === savedTerm || t.id === savedTerm)) {
            this.selectedTerm.set(savedTerm);
            const foundTerm = period.terms.find(t => t.name === savedTerm || t.id === savedTerm);
            if (foundTerm?.id) this.activeTermId.set(foundTerm.id);
          } else if (!this.selectedTerm()) {
            const currentTerm = period.terms.find(t => t.term_number === period.current_term);
            if (currentTerm) {
              this.selectedTerm.set(currentTerm.name);
              this.activeTermId.set(currentTerm.id || '');
            } else if (period.terms.length > 0) {
              this.selectedTerm.set(period.terms[0].name);
              this.activeTermId.set(period.terms[0].id || '');
            }
          }
          this.syncUrlAndSession();
          if (this.selectedClassId() && this.selectedSubjectId()) {
            this.loadExistingGrades();
          }
        }
      },
      error: () => {
         console.warn('Could not load active academic period');
      }
    });
  }

  loadClasses() {
    const savedClass = this.route.snapshot.queryParams['class_id'] || this.selectedClassId() || sessionStorage.getItem('schoollinx_bulk_grade_class') || '';
    this.classService.getClasses().subscribe((classes) => {
      this.classes.set(classes || []);
      if (classes && classes.length > 0) {
        if (savedClass && classes.some(c => c.id === savedClass)) {
          this.selectedClassId.set(savedClass);
        } else if (!this.selectedClassId()) {
          this.selectedClassId.set(classes[0].id);
        }
        const cId = this.selectedClassId();
        if (cId) {
          this.loadClassSpecificSubjects(cId);
          this.loadWeights();
          this.loadStudents();
        }
        this.syncUrlAndSession();
      }
    });
  }

  loadSubjects() {
    const savedSubject = this.route.snapshot.queryParams['subject'] || this.selectedSubjectId() || sessionStorage.getItem('schoollinx_bulk_grade_subject') || '';
    this.subjectService.getSubjects().subscribe((subjects) => {
      this.subjects.set(subjects || []);
      if (subjects && subjects.length > 0) {
        if (savedSubject && subjects.some(s => s.name === savedSubject || s.id === savedSubject)) {
          this.selectedSubjectId.set(savedSubject);
        } else if (!this.selectedSubjectId()) {
          this.selectedSubjectId.set(subjects[0].name);
        }
        this.validateSubjectForCurrentClass();
        this.syncUrlAndSession();
        if (this.selectedClassId() && this.selectedSubjectId()) {
          this.loadExistingGrades();
        }
      }
    });
  }

  private syncUrlAndSession() {
    const cId = this.selectedClassId();
    const sId = this.selectedSubjectId();
    const term = this.selectedTerm();
    const scale = this.selectedScale();

    if (cId) sessionStorage.setItem('schoollinx_bulk_grade_class', cId);
    if (sId) sessionStorage.setItem('schoollinx_bulk_grade_subject', sId);
    if (term) sessionStorage.setItem('schoollinx_bulk_grade_term', term);

    const queryParams: Record<string, string | null> = {};
    if (cId) queryParams['class_id'] = cId;
    if (sId) queryParams['subject'] = sId;
    if (term) queryParams['term'] = term;
    if (scale && scale !== 'STANDARD') queryParams['scale'] = scale;

    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onClassChange() {
    const cId = this.selectedClassId();
    if (cId) {
      this.loadClassSpecificSubjects(cId);
      this.loadWeights();
      this.loadStudents();
      this.validateSubjectForCurrentClass();
    }
    this.syncUrlAndSession();
    if (this.selectedClassId() && this.selectedSubjectId()) {
      this.loadExistingGrades();
    }
  }

  onScaleChange(scale: GradingScaleType) {
    this.selectedScale.set(scale);
    this.syncUrlAndSession();
  }

  loadWeights() {
    this.gradeService.getGradeWeights(this.selectedClassId()).subscribe({
      next: (weights) => {
        if (!weights || weights.length === 0) {
           this.configuredColumns.set([
             { class_id: this.selectedClassId(), category: 'ASSIGNMENT', weight: 0.3 },
             { class_id: this.selectedClassId(), category: 'EXAMS', weight: 0.7 }
           ]);
        } else {
           this.configuredColumns.set(weights.map(w => ({
             ...w,
             weight: w.weight > 1 ? w.weight / 100 : w.weight
           })));
        }
        this.initDraftGrades();
      },
      error: () => {
         this.configuredColumns.set([
           { class_id: this.selectedClassId(), category: 'ASSIGNMENT', weight: 0.3 },
           { class_id: this.selectedClassId(), category: 'EXAMS', weight: 0.7 }
         ]);
         this.initDraftGrades();
      }
    });
  }

  loadStudents() {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe((students) => {
      this.students.set(students.filter(s => s.class_id === this.selectedClassId()));
      this.loadExistingGrades();
    });
  }

  loadExistingGrades() {
    this.initDraftGrades(false);
    this.hasUnsavedChanges.set(false);
    if (!this.selectedClassId() || !this.selectedSubjectId()) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    // Fetch all grades for this class to prepopulate
    this.gradeService.getGradesForClass(this.selectedClassId()).subscribe({
      next: (grades) => {
        const selectedSub = this.subjects().find(s => s.id === this.selectedSubjectId() || s.name === this.selectedSubjectId());
        const subName = selectedSub?.name || this.selectedSubjectId();
        const subId = selectedSub?.id || this.selectedSubjectId();
        const subCode = selectedSub?.code || '';

        const matchSubject = (gSub: string) => {
          if (!this.selectedSubjectId()) return false;
          if (!gSub) return false;
          const sNorm = gSub.trim().toLowerCase();
          return sNorm === subId.toLowerCase() ||
                 sNorm === subName.toLowerCase() ||
                 (subCode !== '' && sNorm === subCode.toLowerCase());
        };

        const matchTerm = (gTerm: string) => {
          if (!this.selectedTerm()) return true;
          if (!gTerm) return false;
          const cleanG = gTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanSel = this.selectedTerm().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanG === cleanSel) return true;
          if ((cleanSel.includes('first') || cleanSel.includes('1')) && (cleanG.includes('first') || cleanG.includes('1') || cleanG === 'term1')) return true;
          if ((cleanSel.includes('second') || cleanSel.includes('2')) && (cleanG.includes('second') || cleanG.includes('2') || cleanG === 'term2')) return true;
          if ((cleanSel.includes('third') || cleanSel.includes('3')) && (cleanG.includes('third') || cleanG.includes('3') || cleanG === 'term3')) return true;
          return false;
        };

        const filtered = (grades || []).filter(g => matchSubject(g.subject) && matchTerm(g.term));

        // Dynamically ensure all categories present in the database are visible as table columns
        const currentCols = [...this.configuredColumns()];
        let colsModified = false;
        filtered.forEach(g => {
          if (g.category) {
            const cleanCat = g.category.trim().toUpperCase();
            const exists = currentCols.some(col => col.category.trim().toUpperCase() === cleanCat);
            if (!exists) {
              currentCols.push({
                class_id: this.selectedClassId(),
                category: g.category.trim().toUpperCase(),
                weight: 0.2
              });
              colsModified = true;
            }
          }
        });

        if (colsModified) {
          this.configuredColumns.set(currentCols);
        }

        const map = this.draftGrades();

        filtered.forEach(g => {
          let studentDraft = map.get(g.student_id);
          if (!studentDraft) {
            studentDraft = {};
            map.set(g.student_id, studentDraft);
          }

          const catKey = (g.category || '').trim().toUpperCase();
          
          // Check if score is marked with a flag in remarks
          let flag: string | undefined;
          if (g.remarks?.includes('[ABS]')) flag = 'ABS';
          else if (g.remarks?.includes('[EX]')) flag = 'EX';
          else if (g.remarks?.includes('[INC]')) flag = 'INC';

          studentDraft[catKey] = { score: g.score, flag, id: g.id };
        });

        this.draftGrades.set(new Map(map));
        this.isLoading.set(false);
        this.checkLocalStorageDraft();
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    const termObj = this.terms().find(t => t.name === this.selectedTerm() || t.id === this.selectedTerm());
    if (termObj && termObj.id) {
      this.activeTermId.set(termObj.id);
    }
    this.syncUrlAndSession();
    if (this.selectedClassId()) {
      this.loadExistingGrades();
    }
  }

  initDraftGrades(reset = false) {
    const currentMap = this.draftGrades();
    const newMap = new Map<string, { [category: string]: { score: number | null, flag?: string, id?: string } }>();
    this.students().forEach(student => {
      if (student.id) {
        const existingStudentDraft = (!reset && currentMap.has(student.id)) ? { ...currentMap.get(student.id) } : {};
        this.configuredColumns().forEach(col => {
          const catKey = col.category.trim().toUpperCase();
          if (!existingStudentDraft[catKey]) {
            existingStudentDraft[catKey] = { score: null };
          }
        });
        newMap.set(student.id, existingStudentDraft);
      }
    });
    this.draftGrades.set(newMap);
  }

  // Autosave & Recovery
  checkLocalStorageDraft() {
    const key = this.getStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.drafts && Object.keys(parsed.drafts).length > 0) {
          this.hasRecoverableDraft.set(true);
          this.draftSavedTime.set(parsed.savedAt ? new Date(parsed.savedAt).toLocaleTimeString() : '');
        }
      } catch {}
    } else {
      this.hasRecoverableDraft.set(false);
    }
  }

  saveToLocalStorage() {
    if (!this.selectedClassId() || !this.selectedSubjectId()) return;
    const map = this.draftGrades();
    const serializable: Record<string, any> = {};
    map.forEach((val, key) => {
      serializable[key] = val;
    });
    localStorage.setItem(this.getStorageKey(), JSON.stringify({
      savedAt: new Date().toISOString(),
      drafts: serializable
    }));
    this.hasUnsavedChanges.set(true);
  }

  restoreLocalDraft() {
    const key = this.getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.drafts) {
        const map = new Map<string, any>();
        Object.keys(parsed.drafts).forEach(studentId => {
          map.set(studentId, parsed.drafts[studentId]);
        });
        this.draftGrades.set(map);
        this.hasUnsavedChanges.set(true);
        this.hasRecoverableDraft.set(false);
        this.dialog.alert('Restored unsaved draft from local backup.', 'Draft Restored', 'success');
      }
    } catch {}
  }

  discardLocalDraft() {
    localStorage.removeItem(this.getStorageKey());
    this.hasRecoverableDraft.set(false);
    this.loadExistingGrades();
  }

  // --- Keyboard Navigation & Cell Management ---
  handleKeyDown(event: KeyboardEvent, studentIndex: number, colIndex: number) {
    if (this.isLocked()) return;
    const numStudents = this.students().length;
    const numCols = this.configuredColumns().length;

    if (event.key === 'Enter') {
      event.preventDefault();
      const nextRow = event.shiftKey ? studentIndex - 1 : studentIndex + 1;
      if (nextRow >= 0 && nextRow < numStudents) {
        this.focusCell(nextRow, colIndex);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (studentIndex + 1 < numStudents) {
        this.focusCell(studentIndex + 1, colIndex);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (studentIndex - 1 >= 0) {
        this.focusCell(studentIndex - 1, colIndex);
      }
    } else if (event.key === 'ArrowRight' && (event.target as HTMLInputElement).selectionEnd === (event.target as HTMLInputElement).value.length) {
      if (colIndex + 1 < numCols) {
        this.focusCell(studentIndex, colIndex + 1);
      }
    } else if (event.key === 'ArrowLeft' && (event.target as HTMLInputElement).selectionStart === 0) {
      if (colIndex - 1 >= 0) {
        this.focusCell(studentIndex, colIndex - 1);
      }
    }
  }

  focusCell(studentIndex: number, colIndex: number) {
    setTimeout(() => {
      const id = `grade-input-${studentIndex}-${colIndex}`;
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }, 10);
  }

  handlePaste(event: ClipboardEvent, startStudentIndex: number, colCategory: string) {
    if (this.isLocked()) return;
    event.preventDefault();
    const clipboardData = event.clipboardData?.getData('text') || '';
    if (!clipboardData) return;

    const lines = clipboardData.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (lines.length === 0) return;

    const studentsList = this.students();
    const map = this.draftGrades();
    let updatedCount = 0;

    lines.forEach((line, offset) => {
      const targetStudentIdx = startStudentIndex + offset;
      if (targetStudentIdx < studentsList.length) {
        const student = studentsList[targetStudentIdx];
        const valStr = line.split('\t')[0].trim();
        this.processRawInput(student.id!, colCategory, valStr, map);
        updatedCount++;
      }
    });

    this.draftGrades.set(new Map(map));
    this.saveToLocalStorage();
    this.dialog.alert(`Pasted ${updatedCount} score(s) into ${colCategory}.`, 'Clipboard Paste', 'info');
  }

  private processRawInput(studentId: string, category: string, rawVal: string, map: Map<string, any>) {
    const catKey = (category || '').trim().toUpperCase();
    let studentDraft = map.get(studentId);
    if (!studentDraft) {
      studentDraft = {};
      map.set(studentId, studentDraft);
    }
    if (!studentDraft[catKey]) {
      studentDraft[catKey] = { score: null };
    }

    const clean = rawVal.toUpperCase().trim();
    if (clean === 'ABS' || clean === 'EX' || clean === 'INC') {
      studentDraft[catKey].score = clean === 'ABS' ? 0 : null;
      studentDraft[catKey].flag = clean;
    } else if (clean === '' || isNaN(Number(clean))) {
      studentDraft[catKey].score = null;
      studentDraft[catKey].flag = undefined;
    } else {
      const num = Math.min(100, Math.max(0, parseFloat(clean)));
      studentDraft[catKey].score = num;
      studentDraft[catKey].flag = undefined;
    }
  }

  // --- Score Value Handling ---
  getDraftDisplayValue(studentId: string, category: string): string {
    const catKey = (category || '').trim().toUpperCase();
    const studentDraft = this.draftGrades().get(studentId);
    if (!studentDraft) return '';
    const item = studentDraft[catKey] || studentDraft[category];
    if (!item) return '';
    if (item.flag) return item.flag;
    return item.score !== null && item.score !== undefined ? String(item.score) : '';
  }

  updateDraftValue(studentId: string, category: string, rawValue: string) {
    if (this.isLocked()) return;
    const map = this.draftGrades();
    this.processRawInput(studentId, category, rawValue, map);
    this.draftGrades.set(new Map(map));
    this.saveToLocalStorage();
  }

  getDraftFlag(studentId: string, category: string): string | undefined {
    const catKey = (category || '').trim().toUpperCase();
    const studentDraft = this.draftGrades().get(studentId);
    return studentDraft?.[catKey]?.flag || studentDraft?.[category]?.flag;
  }

  // --- Calculation Methods ---
  getTotalPercentage(studentId: string): string {
    const studentDraft = this.draftGrades().get(studentId);
    if (!studentDraft) return '—';

    let total = 0;
    let hasAnyScore = false;

    this.configuredColumns().forEach(col => {
      const catKey = col.category.trim().toUpperCase();
      const draft = studentDraft[catKey] || studentDraft[col.category];
      if (draft) {
        if (draft.score !== null && draft.score !== undefined) {
          total += (draft.score * col.weight);
          hasAnyScore = true;
        } else if (draft.flag === 'ABS') {
          hasAnyScore = true; // Absent is counted as 0
        }
      }
    });

    return hasAnyScore ? total.toFixed(1) + '%' : '—';
  }

  getGradeColor(studentId: string): string {
    const totalStr = this.getTotalPercentage(studentId);
    if (totalStr === '—') return 'text-text-muted';

    const pct = parseFloat(totalStr);
    if (pct >= 80) return 'text-emerald-500';
    if (pct >= 60) return 'text-blue-500';
    if (pct >= 40) return 'text-amber-500';
    return 'text-rose-500';
  }

  // Multi-Scale Grade Calculations
  getScaleBand(studentId: string): GradeScaleBand | null {
    const totalStr = this.getTotalPercentage(studentId);
    if (totalStr === '—') return null;
    const pct = parseFloat(totalStr);
    const scale = this.gradingScales[this.selectedScale()];
    return scale.bands.find(b => pct >= b.min && pct <= b.max) || null;
  }

  getFormattedGrade(studentId: string): string {
    const band = this.getScaleBand(studentId);
    return band ? band.label : '—';
  }

  getGradeBadgeClass(studentId: string): string {
    const band = this.getScaleBand(studentId);
    return band ? band.badgeClass : 'bg-bg-tertiary text-text-muted border-border-primary';
  }

  // Ranking & Positions
  studentRankings = computed(() => {
    const scored = this.students()
      .map(s => {
        const pctStr = this.getTotalPercentage(s.id!);
        const pct = pctStr === '—' ? -1 : parseFloat(pctStr);
        return { studentId: s.id!, score: pct };
      })
      .filter(s => s.score >= 0)
      .sort((a, b) => b.score - a.score);

    const ranks = new Map<string, { rank: number; suffix: string; medal?: string }>();
    scored.forEach((item, index) => {
      const rank = index + 1;
      let suffix = 'th';
      if (rank === 1) suffix = 'st';
      else if (rank === 2) suffix = 'nd';
      else if (rank === 3) suffix = 'rd';
      else if (rank % 10 === 1 && rank !== 11) suffix = 'st';
      else if (rank % 10 === 2 && rank !== 12) suffix = 'nd';
      else if (rank % 10 === 3 && rank !== 13) suffix = 'rd';

      let medal: string | undefined;
      if (rank === 1) medal = '🥇';
      else if (rank === 2) medal = '🥈';
      else if (rank === 3) medal = '🥉';

      ranks.set(item.studentId, { rank, suffix, medal });
    });

    return ranks;
  });

  getStudentRank(studentId: string) {
    return this.studentRankings().get(studentId);
  }

  isAtRisk(studentId: string): boolean {
    const totalStr = this.getTotalPercentage(studentId);
    if (totalStr === '—') return false;
    return parseFloat(totalStr) < 40;
  }

  // Statistics
  getAverageColor(avg: string): string {
    if (avg === '—') return 'text-text-muted';
    const n = parseFloat(avg);
    if (n >= 80) return 'text-emerald-500';
    if (n >= 60) return 'text-blue-500';
    if (n >= 40) return 'text-amber-500';
    return 'text-rose-500';
  }

  getClassAverage(): string {
    const scored = this.students().filter(s => this.getTotalPercentage(s.id!) !== '—');
    if (scored.length === 0) return '—';
    const sum = scored.reduce((acc, s) => acc + parseFloat(this.getTotalPercentage(s.id!)), 0);
    return (sum / scored.length).toFixed(1) + '%';
  }

  getPassRate(): string {
    const scored = this.students().filter(s => this.getTotalPercentage(s.id!) !== '—');
    if (scored.length === 0) return '—';
    const passing = scored.filter(s => parseFloat(this.getTotalPercentage(s.id!)) >= 40).length;
    return ((passing / scored.length) * 100).toFixed(0) + '%';
  }

  getTopScore(): string {
    const scored = this.students().map(s => this.getTotalPercentage(s.id!)).filter(v => v !== '—').map(v => parseFloat(v));
    if (scored.length === 0) return '—';
    return Math.max(...scored).toFixed(1) + '%';
  }

  getGradedCount(): number {
    return this.students().filter(s => this.getTotalPercentage(s.id!) !== '—').length;
  }

  getGradeDistribution() {
    const scale = this.gradingScales[this.selectedScale()];
    const bands = scale.bands.map(b => ({ ...b, count: 0 }));

    this.students().forEach(s => {
      const total = this.getTotalPercentage(s.id!);
      if (total === '—') return;
      const pct = parseFloat(total);
      const band = bands.find(b => pct >= b.min && pct <= b.max);
      if (band) band.count++;
    });
    return bands;
  }

  // Lock Toggle
  toggleLock() {
    if (!this.isHeadmasterOrAdmin()) {
      this.dialog.alert('Only Administrators or Headmasters can lock or unlock grade submissions.', 'Permission Denied', 'warning');
      return;
    }
    this.isLocked.update(v => !v);
    this.gradeStatus.set(this.isLocked() ? 'LOCKED' : 'DRAFT');
    this.dialog.alert(
      this.isLocked() ? 'Grades for this class & subject have been LOCKED. Score inputs are now protected.' : 'Grades have been UNLOCKED for editing.',
      this.isLocked() ? 'Grades Locked' : 'Grades Unlocked',
      this.isLocked() ? 'warning' : 'info'
    );
  }

  // Batch Tool (Fill / Curve)
  openBatchTool(category: string, type: 'fill' | 'curve') {
    if (this.isLocked()) return;
    this.activeBatchColumn.set(category);
    this.batchActionType.set(type);
    this.batchValue.set(type === 'fill' ? 100 : 5);
    this.isBatchModalOpen.set(true);
  }

  applyBatchTool() {
    const cat = this.activeBatchColumn();
    const catKey = cat.trim().toUpperCase();
    const type = this.batchActionType();
    const val = this.batchValue();
    const map = this.draftGrades();

    this.students().forEach(s => {
      let studentDraft = map.get(s.id!);
      if (!studentDraft) {
        studentDraft = {};
        map.set(s.id!, studentDraft);
      }
      if (!studentDraft[catKey]) studentDraft[catKey] = { score: null };
      if (type === 'fill') {
        studentDraft[catKey].score = Math.min(100, Math.max(0, val));
        studentDraft[catKey].flag = undefined;
      } else if (type === 'curve') {
        const current = studentDraft[catKey].score ?? 0;
        studentDraft[catKey].score = Math.min(100, Math.max(0, current + val));
      }
    });

    this.draftGrades.set(new Map(map));
    this.saveToLocalStorage();
    this.isBatchModalOpen.set(false);
    this.dialog.alert(`Applied batch ${type} to ${cat} across all students.`, 'Batch Operation', 'success');
  }

  // Terminal Evaluation & Remarks Handlers
  openEvaluation(student: Student) {
    this.evalStudent.set(student);
    this.isEvalModalOpen.set(true);
    this.isEvalLoading.set(true);
    this.evalData.set({});

    const periodId = this.activePeriodId();
    const termId = this.activeTermId();

    this.teacherPortalService.getStudentEvaluation(this.selectedClassId(), student.id!, periodId, termId).subscribe({
      next: (data) => {
        this.evalData.set(data || {
          conduct: '',
          attitude: '',
          interest: '',
          class_teacher_remark: '',
          head_teacher_remark: ''
        });
        this.isEvalLoading.set(false);
      },
      error: () => {
        this.evalData.set({
          conduct: '',
          attitude: '',
          interest: '',
          class_teacher_remark: '',
          head_teacher_remark: ''
        });
        this.isEvalLoading.set(false);
      }
    });
  }

  saveEvaluation() {
    if (!this.evalStudent() || !this.selectedClassId()) return;
    this.isEvalSaving.set(true);
    const payload = {
      ...this.evalData(),
      academic_period_id: this.activePeriodId(),
      term_id: this.activeTermId()
    };

    this.teacherPortalService.updateStudentEvaluation(this.selectedClassId(), this.evalStudent()!.id!, payload).subscribe({
      next: () => {
        this.isEvalSaving.set(false);
        this.dialog.alert(`Evaluation & Remarks saved for ${this.evalStudent()?.first_name} ${this.evalStudent()?.last_name}`, 'Saved', 'success').subscribe();
        this.closeEvaluation();
      },
      error: (err) => {
        this.isEvalSaving.set(false);
        this.dialog.alert(err.error?.error || 'Failed to save evaluation', 'Error', 'error').subscribe();
      }
    });
  }

  closeEvaluation() {
    this.isEvalModalOpen.set(false);
    this.evalStudent.set(null);
    this.evalData.set({});
  }

  applyTemplate(text: string) {
    this.evalData.update(d => ({ ...d, head_teacher_remark: text }));
  }

  isGeneratingAi = signal<boolean>(false);

  generateAiRemarks(tone: 'encouraging' | 'rigorous' | 'balanced' = 'balanced') {
    const student = this.evalStudent();
    if (!student) return;

    this.isGeneratingAi.set(true);
    const scoreStr = this.getTotalPercentage(student.id!);
    const score = parseFloat(scoreStr) || 75;
    const name = student.first_name || 'The student';

    setTimeout(() => {
      let teacherRemark = '';
      let headRemark = '';
      let conduct = 'Respectful & Cooperative';
      let attitude = 'Attentive & Diligent';
      let interest = 'Active in Academic Discussions';

      if (score >= 80) {
        conduct = 'Exemplary & Role Model';
        attitude = 'Highly Proactive & Inquisitive';
        interest = 'Passionate Scholar & Class Contributor';
        if (tone === 'encouraging') {
          teacherRemark = `${name} has delivered an extraordinary academic performance this term. Consistently demonstrates superior mastery of coursework and inspires peers.`;
          headRemark = `Outstanding terminal results. Commended for academic excellence and discipline. Keep striving for the highest laurels!`;
        } else if (tone === 'rigorous') {
          teacherRemark = `${name} exhibits stellar intellectual command and thorough analytical rigor. Must maintain this exceptional trajectory in upcoming examinations.`;
          headRemark = `A brilliant terminal performance. Recommended for academic honors and leadership mentoring.`;
        } else {
          teacherRemark = `${name} displays remarkable dedication and strong academic prowess across all units this term.`;
          headRemark = `Superb achievement. Commendable work ethic and integrity. Well done!`;
        }
      } else if (score >= 65) {
        conduct = 'Well-Behaved & Courteous';
        attitude = 'Positive & Hardworking';
        interest = 'Consistent Class Participation';
        if (tone === 'encouraging') {
          teacherRemark = `${name} has shown commendable progress and great enthusiasm this term. With focused revision in core concepts, greater heights are within reach.`;
          headRemark = `A very good terminal showing. Encouraged to aim for distinction in the coming academic session.`;
        } else if (tone === 'rigorous') {
          teacherRemark = `${name} demonstrates solid comprehension but can achieve distinction with greater consistency in independent study and homework submissions.`;
          headRemark = `Good academic standing. Continuous effort and deeper engagement will unlock full potential.`;
        } else {
          teacherRemark = `${name} is a hardworking scholar who consistently meets academic benchmarks with steady diligence.`;
          headRemark = `Satisfactory progress shown. Keep up the disciplined routine.`;
        }
      } else if (score >= 50) {
        conduct = 'Calm & Receptive';
        attitude = 'Fair Effort, Needs Consistency';
        interest = 'Developing Interest';
        teacherRemark = `${name} possesses promising potential but requires structured study routines and active class participation to bridge conceptual gaps.`;
        headRemark = `Average performance. Greater commitment to remedial review and classroom focus is strongly advised.`;
      } else {
        conduct = 'Needs Guidance';
        attitude = 'Distracted, Requires Close Monitoring';
        interest = 'Passivity Observed';
        teacherRemark = `${name} is experiencing academic difficulty this term. Immediate participation in after-school tutorials and strict parental supervision are recommended.`;
        headRemark = `Unsatisfactory terminal outcome. Parent-teacher conference required to establish an intensive remedial plan.`;
      }

      this.evalData.update(d => ({
        ...d,
        conduct,
        attitude,
        interest,
        class_teacher_remark: teacherRemark,
        head_teacher_remark: headRemark
      }));

      this.isGeneratingAi.set(false);
    }, 350);
  }

  // --- Save to Server ---
  saveGrades() {
    if (this.isLocked()) {
      this.dialog.alert('These grades are currently locked. Unlock first to make modifications.', 'Locked', 'warning').subscribe();
      return;
    }

    if (!this.selectedClassId() || !this.selectedSubjectId()) {
      this.dialog.alert('Please select a class and a subject.', 'Validation Error', 'error').subscribe();
      return;
    }

    const selectedSub = this.subjects().find(s => s.id === this.selectedSubjectId() || s.name === this.selectedSubjectId());
    const resolvedSubject = selectedSub?.name || this.selectedSubjectId();

    const gradesToSave: Partial<Grade>[] = [];

    this.students().forEach(student => {
      if (student.id) {
        const studentDraft = this.draftGrades().get(student.id);
        if (studentDraft) {
          this.configuredColumns().forEach(col => {
            const catKey = col.category.trim().toUpperCase();
            const draft = studentDraft[catKey] || studentDraft[col.category];
            if (draft && (draft.score !== null || draft.flag)) {
              let remarkText = 'Verified & Saved via Admin Console';
              if (draft.flag) {
                remarkText = `[${draft.flag}] ${remarkText}`;
              }

              gradesToSave.push({
                id: draft.id,
                student_id: student.id,
                class_id: this.selectedClassId(),
                subject: resolvedSubject,
                category: col.category.trim(),
                score: draft.score ?? 0,
                max_score: 100,
                term: this.selectedTerm(),
                remarks: remarkText
              });
            }
          });
        }
      }
    });

    if (gradesToSave.length === 0) {
      this.dialog.alert('No grades to save. Please enter at least one score.', 'Warning', 'warning').subscribe();
      return;
    }

    this.isSaving.set(true);
    this.gradeService.bulkCreateGrades(gradesToSave).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.hasUnsavedChanges.set(false);
        localStorage.removeItem(this.getStorageKey());
        this.hasRecoverableDraft.set(false);
        this.dialog.alert(`Successfully saved ${res.imported} grades to server.`, 'Success', 'success').subscribe();
        this.loadExistingGrades();
      },
      error: () => {
        this.isSaving.set(false);
        this.dialog.alert('Failed to save grades.', 'Error', 'error').subscribe();
      }
    });
  }

  // --- Configuration Methods ---
  toggleConfigMode() {
    this.isConfigMode.update(v => !v);
  }

  addColumn() {
    if (!this.newColumnCategory() || this.newColumnWeight() <= 0) {
      this.dialog.alert('Please enter a valid category name and weight percentage (e.g., 30 for 30%).', 'Validation', 'warning').subscribe();
      return;
    }

    const weightDecimal = this.newColumnWeight() / 100;
    const catName = this.newColumnCategory().trim().toUpperCase();

    const newWeight: GradeWeight = {
      class_id: this.selectedClassId(),
      category: catName,
      weight: weightDecimal
    };

    this.gradeService.upsertGradeWeight(newWeight).subscribe({
      next: (res) => {
        const normalized = { ...res, category: (res.category || catName).trim().toUpperCase(), weight: res.weight > 1 ? res.weight / 100 : res.weight };
        this.configuredColumns.update(cols => [...cols, normalized]);
        this.newColumnCategory.set('');
        this.newColumnWeight.set(0);
        this.initDraftGrades(false);
      },
      error: () => {
        this.dialog.alert('Failed to save column configuration.', 'Error', 'error').subscribe();
      }
    });
  }

  removeColumn(index: number) {
    this.configuredColumns.update(cols => {
      const updated = [...cols];
      updated.splice(index, 1);
      return updated;
    });
    this.initDraftGrades(false);
  }

  getTotalWeightPercentage(): number {
    return Math.round(this.configuredColumns().reduce((sum, col) => {
      const pct = col.weight > 1 ? col.weight : col.weight * 100;
      return sum + pct;
    }, 0));
  }
}
