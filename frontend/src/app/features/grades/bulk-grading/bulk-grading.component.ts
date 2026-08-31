import { Component, OnInit, inject, computed } from '@angular/core';
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

@Component({
  selector: 'app-bulk-grading',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-grading.component.html',
  styleUrl: './bulk-grading.component.css'
})
export class BulkGradingComponent implements OnInit {
  // Expose Math to template
  readonly Math = Math;
  private gradeService = inject(GradeService);
  private classService = inject(ClassService);
  private studentService = inject(StudentService);
  private subjectService = inject(SubjectService);
  private academicPeriodService = inject(AcademicPeriodService);
  private teacherPortalService = inject(TeacherPortalService);
  private authService = inject(AuthService);
  private dialog = inject(DialogService);

  classes: Class[] = [];
  subjects: Subject[] = [];
  students: Student[] = [];
  
  selectedClassId: string = '';
  selectedSubjectId: string = '';
  selectedTerm: string = '';
  terms: AcademicTerm[] = [];
  activePeriodId: string = '';
  activeTermId: string = '';

  // Role permissions
  isHeadmasterOrAdmin = computed(() => {
    const role = (this.authService.currentUserValue?.role || '') as string;
    return role === 'ADMIN' || role === 'HEADMASTER' || role === 'ECOPOWER_ADMIN' || role === 'IT_ADMIN';
  });

  // Dynamic columns configured for this class
  configuredColumns: GradeWeight[] = [];
  
  // Configuration Mode State
  isConfigMode = false;
  newColumnCategory = '';
  newColumnWeight = 0;

  // Map of studentId -> category -> { score, gradeId? }
  draftGrades: Map<string, { [category: string]: { score: number | null, id?: string } }> = new Map();

  // Terminal Evaluation & Remarks Modal State
  evalStudent: Student | null = null;
  isEvalModalOpen = false;
  isEvalLoading = false;
  isEvalSaving = false;
  evalData: any = {};

  readonly headmasterTemplates = [
    'Promoted with Distinction. Outstanding academic capability and character.',
    'Promoted to next class. Very commendable performance, keep working hard.',
    'Promoted on trial. Needs focused attention and improvement in core subjects.',
    'Satisfactory performance. Capable of higher achievement with dedication.',
    'Shows consistent academic and disciplinary growth throughout the term.'
  ];

  isLoading = false;
  isSaving = false;

  ngOnInit() {
    this.loadClasses();
    this.loadSubjects();
    this.loadTerms();
  }

  loadTerms() {
    this.academicPeriodService.getActive().subscribe({
      next: (period) => {
        if (period && period.terms) {
          this.activePeriodId = period.id || '';
          this.terms = period.terms;
          const currentTerm = period.terms.find(t => t.term_number === period.current_term);
          if (currentTerm) {
            this.selectedTerm = currentTerm.name;
            this.activeTermId = currentTerm.id || '';
          } else if (this.terms.length > 0) {
            this.selectedTerm = this.terms[0].name;
            this.activeTermId = this.terms[0].id || '';
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
      this.classes = classes;
    });
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe((subjects) => {
      this.subjects = subjects;
    });
  }

  onClassChange() {
    if (this.selectedClassId) {
      this.loadWeights();
      this.loadStudents();
    }
  }

  loadWeights() {
    this.gradeService.getGradeWeights(this.selectedClassId).subscribe({
      next: (weights) => {
        if (!weights || weights.length === 0) {
           this.configuredColumns = [
             { class_id: this.selectedClassId, category: 'ASSIGNMENT', weight: 0.3 },
             { class_id: this.selectedClassId, category: 'EXAMS', weight: 0.7 }
           ];
        } else {
           this.configuredColumns = weights.map(w => ({
             ...w,
             weight: w.weight > 1 ? w.weight / 100 : w.weight
           }));
        }
        this.initDraftGrades();
      },
      error: () => {
         this.configuredColumns = [];
      }
    });
  }

  loadStudents() {
    this.isLoading = true;
    this.studentService.getStudents().subscribe((students) => {
      this.students = students.filter(s => s.class_id === this.selectedClassId);
      this.loadExistingGrades();
    });
  }

  loadExistingGrades() {
    this.initDraftGrades();
    if (!this.selectedClassId) return;

    this.isLoading = true;
    
    // Fetch all grades for this class to prepopulate
    this.gradeService.getGradesForClass(this.selectedClassId).subscribe({
      next: (grades) => {
        const selectedSub = this.subjects.find(s => s.id === this.selectedSubjectId || s.name === this.selectedSubjectId);
        const subName = selectedSub?.name || this.selectedSubjectId;
        const subId = selectedSub?.id || this.selectedSubjectId;
        const subCode = selectedSub?.code || '';

        // Flexible subject matching (by id, name, or code)
        const matchSubject = (gSub: string) => {
          if (!this.selectedSubjectId) return true;
          if (!gSub) return false;
          const sNorm = gSub.trim().toLowerCase();
          return sNorm === subId.toLowerCase() ||
                 sNorm === subName.toLowerCase() ||
                 (subCode !== '' && sNorm === subCode.toLowerCase());
        };

        // Flexible term matching (by exact, normalized, or ordinal number)
        const matchTerm = (gTerm: string) => {
          if (!this.selectedTerm) return true;
          if (!gTerm) return false;
          const cleanG = gTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanSel = this.selectedTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanG === cleanSel) return true;
          if ((cleanSel.includes('first') || cleanSel.includes('1')) && (cleanG.includes('first') || cleanG.includes('1') || cleanG === 'term1')) return true;
          if ((cleanSel.includes('second') || cleanSel.includes('2')) && (cleanG.includes('second') || cleanG.includes('2') || cleanG === 'term2')) return true;
          if ((cleanSel.includes('third') || cleanSel.includes('3')) && (cleanG.includes('third') || cleanG.includes('3') || cleanG === 'term3')) return true;
          return false;
        };

        const filtered = (grades || []).filter(g => matchSubject(g.subject) && matchTerm(g.term));

        filtered.forEach(g => {
          const studentDraft = this.draftGrades.get(g.student_id);
          if (studentDraft) {
            // Find matching column category case-insensitively or by category alias
            const matchingCol = this.configuredColumns.find(col => {
              const c1 = col.category.trim().toLowerCase();
              const c2 = (g.category || '').trim().toLowerCase();
              if (c1 === c2) return true;
              if ((c1.includes('home') || c1.includes('assign')) && (c2.includes('home') || c2.includes('assign'))) return true;
              if ((c1.includes('mid') || c1.includes('test')) && (c2.includes('mid') || c2.includes('test'))) return true;
              if ((c1.includes('exam') || c1.includes('final') || c1.includes('end')) && (c2.includes('exam') || c2.includes('final') || c2.includes('end'))) return true;
              return false;
            });
            const targetCategory = matchingCol ? matchingCol.category : g.category;
            studentDraft[targetCategory] = { score: g.score, id: g.id };
          }
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onFilterChange() {
    const termObj = this.terms.find(t => t.name === this.selectedTerm || t.id === this.selectedTerm);
    if (termObj && termObj.id) {
      this.activeTermId = termObj.id;
    }
    if (this.selectedClassId) {
      this.loadExistingGrades();
    }
  }

  initDraftGrades() {
    this.draftGrades.clear();
    this.students.forEach(student => {
      if (student.id) {
        const initialMap: any = {};
        this.configuredColumns.forEach(col => {
          initialMap[col.category] = { score: null };
        });
        this.draftGrades.set(student.id, initialMap);
      }
    });
  }

  // Terminal Evaluation & Remarks Handlers
  openEvaluation(student: Student) {
    this.evalStudent = student;
    this.isEvalModalOpen = true;
    this.isEvalLoading = true;
    this.evalData = {};

    const periodId = this.activePeriodId || '00000000-0000-0000-0000-000000000000';
    const termId = this.activeTermId || '00000000-0000-0000-0000-000000000000';

    this.teacherPortalService.getStudentEvaluation(this.selectedClassId, student.id!, periodId, termId).subscribe({
      next: (data) => {
        this.evalData = data || {
          conduct: '',
          attitude: '',
          interest: '',
          class_teacher_remark: '',
          head_teacher_remark: ''
        };
        this.isEvalLoading = false;
      },
      error: () => {
        this.evalData = {
          conduct: '',
          attitude: '',
          interest: '',
          class_teacher_remark: '',
          head_teacher_remark: ''
        };
        this.isEvalLoading = false;
      }
    });
  }

  saveEvaluation() {
    if (!this.evalStudent || !this.selectedClassId) return;
    this.isEvalSaving = true;
    const payload = {
      ...this.evalData,
      academic_period_id: this.activePeriodId || '00000000-0000-0000-0000-000000000000',
      term_id: this.activeTermId || '00000000-0000-0000-0000-000000000000'
    };

    this.teacherPortalService.updateStudentEvaluation(this.selectedClassId, this.evalStudent.id!, payload).subscribe({
      next: () => {
        this.isEvalSaving = false;
        this.dialog.alert(`Evaluation & Remarks saved for ${this.evalStudent?.first_name} ${this.evalStudent?.last_name}`, 'Saved', 'success').subscribe();
        this.closeEvaluation();
      },
      error: (err) => {
        this.isEvalSaving = false;
        this.dialog.alert(err.error?.error || 'Failed to save evaluation', 'Error', 'error').subscribe();
      }
    });
  }

  closeEvaluation() {
    this.isEvalModalOpen = false;
    this.evalStudent = null;
    this.evalData = {};
  }

  applyTemplate(text: string) {
    this.evalData.head_teacher_remark = text;
  }

  getDraft(studentId: string, category: string) {
    const studentDraft = this.draftGrades.get(studentId);
    return studentDraft ? studentDraft[category] : { score: null };
  }

  updateDraft(studentId: string, category: string, value: any) {
    const studentDraft = this.draftGrades.get(studentId);
    if (studentDraft) {
      if (!studentDraft[category]) studentDraft[category] = { score: null };
      studentDraft[category].score = value === '' ? null : Number(value);
    }
  }

  getTotalPercentage(studentId: string): string {
    const studentDraft = this.draftGrades.get(studentId);
    if (!studentDraft) return '—';

    let total = 0;
    let hasAnyScore = false;

    this.configuredColumns.forEach(col => {
      const draft = studentDraft[col.category];
      if (draft && draft.score !== null) {
        // Calculate based on weight. E.g., if score is out of 100, score * weight.
        total += (draft.score * col.weight);
        hasAnyScore = true;
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

  getLetterGrade(studentId: string): string {
    const totalStr = this.getTotalPercentage(studentId);
    if (totalStr === '—') return '—';
    const pct = parseFloat(totalStr);
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    if (pct >= 40) return 'E';
    return 'F';
  }

  getLetterGradeBadgeClass(studentId: string): string {
    const letter = this.getLetterGrade(studentId);
    const map: Record<string, string> = {
      'A': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'B': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'C': 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      'D': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'E': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'F': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    };
    return map[letter] || 'bg-bg-tertiary text-text-muted border-border-primary';
  }

  getAverageColor(avg: string): string {
    if (avg === '—') return 'text-text-muted';
    const n = parseFloat(avg);
    if (n >= 80) return 'text-emerald-500';
    if (n >= 60) return 'text-blue-500';
    if (n >= 40) return 'text-amber-500';
    return 'text-rose-500';
  }

  getClassAverage(): string {
    const scored = this.students.filter(s => this.getTotalPercentage(s.id!) !== '—');
    if (scored.length === 0) return '—';
    const sum = scored.reduce((acc, s) => acc + parseFloat(this.getTotalPercentage(s.id!)), 0);
    return (sum / scored.length).toFixed(1) + '%';
  }

  getPassRate(): string {
    const scored = this.students.filter(s => this.getTotalPercentage(s.id!) !== '—');
    if (scored.length === 0) return '—';
    const passing = scored.filter(s => parseFloat(this.getTotalPercentage(s.id!)) >= 40).length;
    return ((passing / scored.length) * 100).toFixed(0) + '%';
  }

  getTopScore(): string {
    const scored = this.students.map(s => this.getTotalPercentage(s.id!)).filter(v => v !== '—').map(v => parseFloat(v));
    if (scored.length === 0) return '—';
    return Math.max(...scored).toFixed(1) + '%';
  }

  getGradedCount(): number {
    return this.students.filter(s => this.getTotalPercentage(s.id!) !== '—').length;
  }

  getGradeDistribution() {
    const bands = [
      { label: 'A', min: 80, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', count: 0 },
      { label: 'B', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', count: 0 },
      { label: 'C', min: 60, max: 69, color: 'bg-teal-500', textColor: 'text-teal-500', count: 0 },
      { label: 'D', min: 50, max: 59, color: 'bg-amber-500', textColor: 'text-amber-500', count: 0 },
      { label: 'E', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', count: 0 },
      { label: 'F', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', count: 0 },
    ];
    this.students.forEach(s => {
      const total = this.getTotalPercentage(s.id!);
      if (total === '—') return;
      const pct = parseFloat(total);
      const band = bands.find(b => pct >= b.min && pct <= b.max);
      if (band) band.count++;
    });
    return bands;
  }

  readonly gradeKey = [
    { label: 'A', range: '80–100%', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { label: 'B', range: '70–79%', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { label: 'C', range: '60–69%', badgeClass: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
    { label: 'D', range: '50–59%', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { label: 'E', range: '40–49%', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { label: 'F', range: '0–39%', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  ];

  saveGrades() {
    if (!this.selectedClassId || !this.selectedSubjectId) {
      this.dialog.alert('Please select a class and a subject.', 'Validation Error', 'error').subscribe();
      return;
    }

    const selectedSub = this.subjects.find(s => s.id === this.selectedSubjectId || s.name === this.selectedSubjectId);
    const resolvedSubject = selectedSub?.id || this.selectedSubjectId;

    const gradesToSave: Partial<Grade>[] = [];
    
    this.students.forEach(student => {
      if (student.id) {
        const studentDraft = this.draftGrades.get(student.id);
        if (studentDraft) {
          this.configuredColumns.forEach(col => {
            const draft = studentDraft[col.category];
            if (draft && draft.score !== null) {
              gradesToSave.push({
                id: draft.id, // Include ID if it's an update
                student_id: student.id,
                class_id: this.selectedClassId,
                subject: resolvedSubject,
                category: col.category,
                score: draft.score,
                max_score: 100,
                term: this.selectedTerm,
                remarks: 'Verified & Saved via Admin Console'
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

    this.isSaving = true;
    this.gradeService.bulkCreateGrades(gradesToSave).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.dialog.alert(`Successfully saved ${res.imported} grades.`, 'Success', 'success').subscribe();
        this.loadExistingGrades(); // Reload to get newly created IDs
      },
      error: (err) => {
        this.isSaving = false;
        this.dialog.alert('Failed to save grades.', 'Error', 'error').subscribe();
      }
    });
  }

  // --- Configuration Methods ---
  toggleConfigMode() {
    this.isConfigMode = !this.isConfigMode;
  }

  addColumn() {
    if (!this.newColumnCategory || this.newColumnWeight <= 0) {
      this.dialog.alert('Please enter a valid category name and weight percentage (e.g., 30 for 30%).', 'Validation', 'warning').subscribe();
      return;
    }

    const weightDecimal = this.newColumnWeight / 100;
    
    // Add locally
    const newWeight: GradeWeight = {
      class_id: this.selectedClassId,
      category: this.newColumnCategory.toUpperCase(),
      weight: weightDecimal
    };

    this.gradeService.upsertGradeWeight(newWeight).subscribe({
      next: (res) => {
        // Normalize the returned weight to decimal (API may return 20 for 20%)
        const normalized = { ...res, weight: res.weight > 1 ? res.weight / 100 : res.weight };
        this.configuredColumns.push(normalized);
        this.newColumnCategory = '';
        this.newColumnWeight = 0;
        this.initDraftGrades(); // Re-initialize rows
      },
      error: () => {
        this.dialog.alert('Failed to save column configuration.', 'Error', 'error').subscribe();
      }
    });
  }

  removeColumn(index: number) {
    // In a real app, you'd add a DELETE endpoint for weights.
    // For now, we just remove it locally and ignore any grades tied to it.
    this.configuredColumns.splice(index, 1);
    this.initDraftGrades();
  }

  getTotalWeightPercentage(): number {
    return Math.round(this.configuredColumns.reduce((sum, col) => {
      // weight is always stored as decimal (0.2 = 20%) after normalization
      const pct = col.weight > 1 ? col.weight : col.weight * 100;
      return sum + pct;
    }, 0));
  }
}
