import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
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

  classes = signal<Class[]>([]);
  subjects = signal<Subject[]>([]);
  students = signal<Student[]>([]);

  selectedClassId = signal('');
  selectedSubjectId = signal('');
  selectedTerm = signal('');
  terms = signal<AcademicTerm[]>([]);
  activePeriodId = signal('');
  activeTermId = signal('');

  // Role permissions
  isHeadmasterOrAdmin = computed(() => {
    const role = (this.authService.currentUserValue?.role || '') as string;
    return role === 'ADMIN' || role === 'HEADMASTER' || role === 'ECOPOWER_ADMIN' || role === 'IT_ADMIN';
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
    this.loadClasses();
    this.loadSubjects();
    this.loadTerms();
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
    this.academicPeriodService.getActive().subscribe({
      next: (period) => {
        if (period && period.terms) {
          this.activePeriodId.set(period.id || '');
          this.terms.set(period.terms);
          const currentTerm = period.terms.find(t => t.term_number === period.current_term);
          if (currentTerm) {
            this.selectedTerm.set(currentTerm.name);
            this.activeTermId.set(currentTerm.id || '');
          } else if (period.terms.length > 0) {
            this.selectedTerm.set(period.terms[0].name);
            this.activeTermId.set(period.terms[0].id || '');
          }
        }
      },
      error: () => {
         console.warn('Could not load active academic period');
      }
    });
  }

  loadClasses() {
    this.classService.getClasses().subscribe((classes) => {
      this.classes.set(classes);
    });
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe((subjects) => {
      this.subjects.set(subjects);
    });
  }

  onClassChange() {
    if (this.selectedClassId()) {
      this.loadWeights();
      this.loadStudents();
    }
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
         this.configuredColumns.set([]);
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
    this.initDraftGrades();
    this.hasUnsavedChanges.set(false);
    if (!this.selectedClassId()) return;

    this.isLoading.set(true);

    // Fetch all grades for this class to prepopulate
    this.gradeService.getGradesForClass(this.selectedClassId()).subscribe({
      next: (grades) => {
        const selectedSub = this.subjects().find(s => s.id === this.selectedSubjectId() || s.name === this.selectedSubjectId());
        const subName = selectedSub?.name || this.selectedSubjectId();
        const subId = selectedSub?.id || this.selectedSubjectId();
        const subCode = selectedSub?.code || '';

        const matchSubject = (gSub: string) => {
          if (!this.selectedSubjectId()) return true;
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
        const map = this.draftGrades();

        filtered.forEach(g => {
          const studentDraft = map.get(g.student_id);
          if (studentDraft) {
            const matchingCol = this.configuredColumns().find(col => {
              const c1 = col.category.trim().toLowerCase();
              const c2 = (g.category || '').trim().toLowerCase();
              if (c1 === c2) return true;
              if ((c1.includes('home') || c1.includes('assign')) && (c2.includes('home') || c2.includes('assign'))) return true;
              if ((c1.includes('mid') || c1.includes('test')) && (c2.includes('mid') || c2.includes('test'))) return true;
              if ((c1.includes('exam') || c1.includes('final') || c1.includes('end')) && (c2.includes('exam') || c2.includes('final') || c2.includes('end'))) return true;
              return false;
            });
            const targetCategory = matchingCol ? matchingCol.category : g.category;
            
            // Check if score is marked with a flag in remarks
            let flag: string | undefined;
            if (g.remarks?.includes('[ABS]')) flag = 'ABS';
            else if (g.remarks?.includes('[EX]')) flag = 'EX';
            else if (g.remarks?.includes('[INC]')) flag = 'INC';

            studentDraft[targetCategory] = { score: g.score, flag, id: g.id };
          }
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
    if (this.selectedClassId()) {
      this.loadExistingGrades();
    }
  }

  initDraftGrades() {
    const newMap = new Map<string, { [category: string]: { score: number | null, flag?: string, id?: string } }>();
    this.students().forEach(student => {
      if (student.id) {
        const initialMap: any = {};
        this.configuredColumns().forEach(col => {
          initialMap[col.category] = { score: null };
        });
        newMap.set(student.id, initialMap);
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
    let studentDraft = map.get(studentId);
    if (!studentDraft) {
      studentDraft = {};
      map.set(studentId, studentDraft);
    }
    if (!studentDraft[category]) {
      studentDraft[category] = { score: null };
    }

    const clean = rawVal.toUpperCase().trim();
    if (clean === 'ABS' || clean === 'EX' || clean === 'INC') {
      studentDraft[category].score = clean === 'ABS' ? 0 : null;
      studentDraft[category].flag = clean;
    } else if (clean === '' || isNaN(Number(clean))) {
      studentDraft[category].score = null;
      studentDraft[category].flag = undefined;
    } else {
      const num = Math.min(100, Math.max(0, parseFloat(clean)));
      studentDraft[category].score = num;
      studentDraft[category].flag = undefined;
    }
  }

  // --- Score Value Handling ---
  getDraftDisplayValue(studentId: string, category: string): string {
    const studentDraft = this.draftGrades().get(studentId);
    if (!studentDraft || !studentDraft[category]) return '';
    const item = studentDraft[category];
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
    const studentDraft = this.draftGrades().get(studentId);
    return studentDraft?.[category]?.flag;
  }

  // --- Calculation Methods ---
  getTotalPercentage(studentId: string): string {
    const studentDraft = this.draftGrades().get(studentId);
    if (!studentDraft) return '—';

    let total = 0;
    let hasAnyScore = false;

    this.configuredColumns().forEach(col => {
      const draft = studentDraft[col.category];
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
    const type = this.batchActionType();
    const val = this.batchValue();
    const map = this.draftGrades();

    this.students().forEach(s => {
      const studentDraft = map.get(s.id!);
      if (studentDraft) {
        if (!studentDraft[cat]) studentDraft[cat] = { score: null };
        if (type === 'fill') {
          studentDraft[cat].score = Math.min(100, Math.max(0, val));
          studentDraft[cat].flag = undefined;
        } else if (type === 'curve') {
          const current = studentDraft[cat].score ?? 0;
          studentDraft[cat].score = Math.min(100, Math.max(0, current + val));
        }
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

    const periodId = this.activePeriodId() || '00000000-0000-0000-0000-000000000000';
    const termId = this.activeTermId() || '00000000-0000-0000-0000-000000000000';

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
      academic_period_id: this.activePeriodId() || '00000000-0000-0000-0000-000000000000',
      term_id: this.activeTermId() || '00000000-0000-0000-0000-000000000000'
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
    const resolvedSubject = selectedSub?.id || this.selectedSubjectId();

    const gradesToSave: Partial<Grade>[] = [];

    this.students().forEach(student => {
      if (student.id) {
        const studentDraft = this.draftGrades().get(student.id);
        if (studentDraft) {
          this.configuredColumns().forEach(col => {
            const draft = studentDraft[col.category];
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
                category: col.category,
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

    const newWeight: GradeWeight = {
      class_id: this.selectedClassId(),
      category: this.newColumnCategory().toUpperCase(),
      weight: weightDecimal
    };

    this.gradeService.upsertGradeWeight(newWeight).subscribe({
      next: (res) => {
        const normalized = { ...res, weight: res.weight > 1 ? res.weight / 100 : res.weight };
        this.configuredColumns.update(cols => [...cols, normalized]);
        this.newColumnCategory.set('');
        this.newColumnWeight.set(0);
        this.initDraftGrades();
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
    this.initDraftGrades();
  }

  getTotalWeightPercentage(): number {
    return Math.round(this.configuredColumns().reduce((sum, col) => {
      const pct = col.weight > 1 ? col.weight : col.weight * 100;
      return sum + pct;
    }, 0));
  }
}
