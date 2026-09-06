import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod, AcademicTerm } from '../../../core/domain/academic-period.model';
import { GradeWeight } from '../../../core/domain/grade.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

export type GradingScaleType = 'STANDARD' | 'WAEC' | 'CAMBRIDGE' | 'GPA';

export interface GradeScaleBand {
  label: string;
  min: number;
  max: number;
  color: string;
  textColor: string;
  badgeClass: string;
  remark: string;
  gpaPoint?: number;
}

export interface GradeScaleDefinition {
  id: GradingScaleType;
  name: string;
  description: string;
  region: string;
  bands: GradeScaleBand[];
}

export interface ColumnConfigItem {
  id?: string;
  category: string;
  weight: number; // Stored as 0-100 percentage in UI
}

@Component({
  selector: 'app-grading-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './grading-configuration.component.html',
  styleUrl: './grading-configuration.component.css'
})
export class GradingConfigurationComponent implements OnInit {
  readonly Math = Math;
  private gradeService = inject(GradeService);
  private classService = inject(ClassService);
  private apService = inject(AcademicPeriodService);
  private dialog = inject(DialogService);
  private authService = inject(AuthService);

  // Active Tab
  activeTab = signal<'general' | 'classes' | 'scales' | 'terms'>('general');

  // Academic Terms & Global Locking State
  activePeriod = signal<AcademicPeriod | null>(null);
  terms = signal<AcademicTerm[]>([]);
  isLoadingTerms = signal<boolean>(false);
  isTogglingLock = signal<string | null>(null);

  // Classes
  classes = signal<Class[]>([]);
  selectedClassId = signal<string>('');

  // General Columns State
  generalColumns = signal<ColumnConfigItem[]>([]);
  isSavingGeneral = signal<boolean>(false);
  isLoadingGeneral = signal<boolean>(false);

  // Class Columns State
  classColumns = signal<ColumnConfigItem[]>([]);
  isClassInherited = signal<boolean>(true);
  isSavingClass = signal<boolean>(false);
  isLoadingClass = signal<boolean>(false);

  // New Column Inputs (General)
  newGeneralCategory = signal('');
  newGeneralWeight = signal(10);

  // New Column Inputs (Class)
  newClassCategory = signal('');
  newClassWeight = signal(10);

  // Selected Active Evaluation Scale
  selectedScale = signal<GradingScaleType>('STANDARD');
  readonly scaleKeys: GradingScaleType[] = ['STANDARD', 'WAEC', 'CAMBRIDGE', 'GPA'];

  // Grading Scales Definitions
  readonly gradingScales: Record<GradingScaleType, GradeScaleDefinition> = {
    STANDARD: {
      id: 'STANDARD',
      name: 'Standard (A–F)',
      description: 'Standard 100-point letter grading system used across international and general secondary curricula.',
      region: 'International / General',
      bands: [
        { label: 'A', min: 80, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'C', min: 60, max: 69, color: 'bg-teal-500', textColor: 'text-teal-500', badgeClass: 'bg-teal-500/10 text-teal-500 border-teal-500/20', remark: 'Good' },
        { label: 'D', min: 50, max: 59, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Credit / Pass' },
        { label: 'E', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Weak Pass' },
        { label: 'F', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Fail' }
      ]
    },
    WAEC: {
      id: 'WAEC',
      name: 'WAEC / BECE (A1–F9)',
      description: 'West African Examinations Council standard 9-point numerical grading system.',
      region: 'West Africa (Ghana, Nigeria, Sierra Leone, Gambia, Liberia)',
      bands: [
        { label: 'A1', min: 80, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B2', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'B3', min: 65, max: 69, color: 'bg-indigo-500', textColor: 'text-indigo-500', badgeClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', remark: 'Good' },
        { label: 'C4', min: 60, max: 64, color: 'bg-teal-500', textColor: 'text-teal-500', badgeClass: 'bg-teal-500/10 text-teal-500 border-teal-500/20', remark: 'Credit' },
        { label: 'C5', min: 55, max: 59, color: 'bg-cyan-500', textColor: 'text-cyan-500', badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', remark: 'Credit' },
        { label: 'C6', min: 50, max: 54, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Credit' },
        { label: 'D7', min: 45, max: 49, color: 'bg-orange-400', textColor: 'text-orange-400', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20', remark: 'Pass' },
        { label: 'E8', min: 40, max: 44, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Pass' },
        { label: 'F9', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Fail' }
      ]
    },
    CAMBRIDGE: {
      id: 'CAMBRIDGE',
      name: 'Cambridge / IGCSE (A*–U)',
      description: 'Cambridge International Assessment benchmark with distinction star tier.',
      region: 'British & International Baccalaureate Curriculum',
      bands: [
        { label: 'A*', min: 90, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Outstanding' },
        { label: 'A', min: 80, max: 89, color: 'bg-emerald-400', textColor: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', remark: 'Excellent' },
        { label: 'B', min: 70, max: 79, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'Very Good' },
        { label: 'C', min: 60, max: 69, color: 'bg-teal-400', textColor: 'text-teal-400', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20', remark: 'Good' },
        { label: 'D', min: 50, max: 59, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Satisfactory' },
        { label: 'E', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Acceptable' },
        { label: 'U', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Ungraded' }
      ]
    },
    GPA: {
      id: 'GPA',
      name: 'GPA (4.0 Scale)',
      description: 'Standard Grade Point Average calculation scale with grade point conversions.',
      region: 'American / Collegiate',
      bands: [
        { label: '4.0 (A)', min: 85, max: 100, color: 'bg-emerald-500', textColor: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', remark: 'Honors', gpaPoint: 4.0 },
        { label: '3.5 (B+)', min: 75, max: 84, color: 'bg-blue-500', textColor: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remark: 'High Pass', gpaPoint: 3.5 },
        { label: '3.0 (B)', min: 65, max: 74, color: 'bg-indigo-400', textColor: 'text-indigo-400', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', remark: 'Above Average', gpaPoint: 3.0 },
        { label: '2.5 (C+)', min: 55, max: 64, color: 'bg-amber-400', textColor: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', remark: 'Average', gpaPoint: 2.5 },
        { label: '2.0 (C)', min: 50, max: 54, color: 'bg-amber-500', textColor: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remark: 'Passing', gpaPoint: 2.0 },
        { label: '1.0 (D)', min: 40, max: 49, color: 'bg-orange-500', textColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remark: 'Conditional', gpaPoint: 1.0 },
        { label: '0.0 (F)', min: 0, max: 39, color: 'bg-rose-500', textColor: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remark: 'Failing', gpaPoint: 0.0 }
      ]
    }
  };

  // Computeds
  totalGeneralWeight = computed(() => {
    return this.generalColumns().reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  });

  totalClassWeight = computed(() => {
    return this.classColumns().reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  });

  selectedClassName = computed(() => {
    const c = this.classes().find(cls => cls.id === this.selectedClassId());
    return c ? c.name : 'Select a Class';
  });

  ngOnInit() {
    this.loadSavedScale();
    this.loadGeneralWeights();
    this.loadClasses();
    this.loadAcademicTerms();
  }

  loadSavedScale() {
    const saved = localStorage.getItem('schoollinx_default_grading_scale') as GradingScaleType;
    if (saved && this.gradingScales[saved]) {
      this.selectedScale.set(saved);
    }
  }

  saveDefaultScale(scale: GradingScaleType) {
    this.selectedScale.set(scale);
    localStorage.setItem('schoollinx_default_grading_scale', scale);
    this.dialog.alert(`Institutional evaluation scale set to ${this.gradingScales[scale].name}.`, 'Grading Scale Updated', 'success');
  }

  loadGeneralWeights() {
    this.isLoadingGeneral.set(true);
    this.gradeService.getGeneralWeights().subscribe({
      next: (weights) => {
        if (weights && weights.length > 0) {
          this.generalColumns.set(weights.map(w => ({
            id: w.id,
            category: w.category,
            weight: w.weight > 1 ? Math.round(w.weight) : Math.round(w.weight * 100)
          })));
        } else {
          this.applyGeneralPreset('standard');
        }
        this.isLoadingGeneral.set(false);
      },
      error: () => {
        this.applyGeneralPreset('standard');
        this.isLoadingGeneral.set(false);
      }
    });
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (classes) => {
        this.classes.set(classes || []);
        if (classes && classes.length > 0 && !this.selectedClassId()) {
          this.selectedClassId.set(classes[0].id);
          this.loadClassWeights(classes[0].id);
        }
      }
    });
  }

  onClassSelect(classId: string) {
    this.selectedClassId.set(classId);
    if (classId) {
      this.loadClassWeights(classId);
    }
  }

  loadClassWeights(classId: string) {
    this.isLoadingClass.set(true);
    this.gradeService.getGradeWeights(classId).subscribe({
      next: (weights) => {
        if (weights && weights.length > 0) {
          const hasCustom = weights.some(w => w.class_id === classId);
          this.isClassInherited.set(!hasCustom);
          this.classColumns.set(weights.map(w => ({
            id: w.id,
            category: w.category,
            weight: w.weight > 1 ? Math.round(w.weight) : Math.round(w.weight * 100)
          })));
        } else {
          this.isClassInherited.set(true);
          this.applyClassPreset('standard');
        }
        this.isLoadingClass.set(false);
      },
      error: () => {
        this.isClassInherited.set(true);
        this.applyClassPreset('standard');
        this.isLoadingClass.set(false);
      }
    });
  }

  // --- General Presets & CRUD ---
  applyGeneralPreset(type: 'standard' | 'trimester' | 'continuous' | 'university') {
    switch (type) {
      case 'standard':
        this.generalColumns.set([
          { category: 'CONTINUOUS ASSESSMENT', weight: 30 },
          { category: 'EXAMS', weight: 70 }
        ]);
        break;
      case 'trimester':
        this.generalColumns.set([
          { category: 'CLASS WORK', weight: 20 },
          { category: 'HOMEWORK', weight: 20 },
          { category: 'PROJECT', weight: 20 },
          { category: 'EXAMS', weight: 40 }
        ]);
        break;
      case 'continuous':
        this.generalColumns.set([
          { category: 'ASSIGNMENT', weight: 10 },
          { category: 'CLASS TEST', weight: 15 },
          { category: 'MID-TERM EXAM', weight: 25 },
          { category: 'FINAL EXAM', weight: 50 }
        ]);
        break;
      case 'university':
        this.generalColumns.set([
          { category: 'COURSEWORK', weight: 40 },
          { category: 'FINAL EXAMINATION', weight: 60 }
        ]);
        break;
    }
  }

  addGeneralColumn() {
    const cat = this.newGeneralCategory().trim().toUpperCase();
    const wt = this.newGeneralWeight();
    if (!cat) {
      this.dialog.alert('Please enter an assessment category name.', 'Missing Category', 'warning');
      return;
    }
    const exists = this.generalColumns().some(c => c.category === cat);
    if (exists) {
      this.dialog.alert(`Category "${cat}" already exists in configuration.`, 'Duplicate Category', 'warning');
      return;
    }
    this.generalColumns.update(cols => [...cols, { category: cat, weight: wt }]);
    this.newGeneralCategory.set('');
    this.newGeneralWeight.set(10);
  }

  updateGeneralCategory(index: number, category: string) {
    this.generalColumns.update(cols =>
      cols.map((c, i) => (i === index ? { ...c, category } : c))
    );
  }

  updateGeneralWeight(index: number, weightVal: any) {
    const parsed = typeof weightVal === 'number' ? weightVal : parseFloat(weightVal);
    const safe = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, Math.round(parsed)));
    this.generalColumns.update(cols =>
      cols.map((c, i) => (i === index ? { ...c, weight: safe } : c))
    );
  }

  autoBalanceGeneralWeights() {
    const cols = this.generalColumns();
    if (cols.length === 0) return;
    const base = Math.floor(100 / cols.length);
    const remainder = 100 - base * cols.length;
    this.generalColumns.set(
      cols.map((c, i) => ({
        ...c,
        weight: i === cols.length - 1 ? base + remainder : base
      }))
    );
  }

  removeGeneralColumn(index: number) {
    if (this.generalColumns().length <= 1) {
      this.dialog.alert('At least one assessment category column is required.', 'Cannot Remove', 'warning');
      return;
    }
    this.generalColumns.update(cols => cols.filter((_, i) => i !== index));
  }

  saveGeneralWeights() {
    const total = this.totalGeneralWeight();
    if (total !== 100) {
      this.dialog.alert(`Total assessment weight must equal exactly 100%. Currently it is ${total}%.`, 'Invalid Weights', 'danger');
      return;
    }

    this.isSavingGeneral.set(true);
    const payload: GradeWeight[] = this.generalColumns().map(c => ({
      category: c.category.trim().toUpperCase(),
      weight: c.weight / 100
    }));

    this.gradeService.updateGeneralWeights(payload).subscribe({
      next: () => {
        this.isSavingGeneral.set(false);
        this.dialog.alert('General school assessment columns and weights have been successfully saved.', 'Configuration Saved', 'success');
        this.loadGeneralWeights();
      },
      error: (err) => {
        this.isSavingGeneral.set(false);
        this.dialog.alert(err.error?.error || 'Failed to save general assessment weights.', 'Save Failed', 'danger');
      }
    });
  }

  // --- Class Presets & CRUD ---
  updateClassCategory(index: number, category: string) {
    this.classColumns.update(cols =>
      cols.map((c, i) => (i === index ? { ...c, category } : c))
    );
  }

  updateClassWeight(index: number, weightVal: any) {
    const parsed = typeof weightVal === 'number' ? weightVal : parseFloat(weightVal);
    const safe = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, Math.round(parsed)));
    this.classColumns.update(cols =>
      cols.map((c, i) => (i === index ? { ...c, weight: safe } : c))
    );
  }

  autoBalanceClassWeights() {
    const cols = this.classColumns();
    if (cols.length === 0) return;
    const base = Math.floor(100 / cols.length);
    const remainder = 100 - base * cols.length;
    this.classColumns.set(
      cols.map((c, i) => ({
        ...c,
        weight: i === cols.length - 1 ? base + remainder : base
      }))
    );
  }
  applyClassPreset(type: 'standard' | 'trimester' | 'continuous' | 'university') {
    switch (type) {
      case 'standard':
        this.classColumns.set([
          { category: 'CONTINUOUS ASSESSMENT', weight: 30 },
          { category: 'EXAMS', weight: 70 }
        ]);
        break;
      case 'trimester':
        this.classColumns.set([
          { category: 'CLASS WORK', weight: 20 },
          { category: 'HOMEWORK', weight: 20 },
          { category: 'PROJECT', weight: 20 },
          { category: 'EXAMS', weight: 40 }
        ]);
        break;
      case 'continuous':
        this.classColumns.set([
          { category: 'ASSIGNMENT', weight: 10 },
          { category: 'CLASS TEST', weight: 15 },
          { category: 'MID-TERM EXAM', weight: 25 },
          { category: 'FINAL EXAM', weight: 50 }
        ]);
        break;
      case 'university':
        this.classColumns.set([
          { category: 'COURSEWORK', weight: 40 },
          { category: 'FINAL EXAMINATION', weight: 60 }
        ]);
        break;
    }
  }

  addClassColumn() {
    const cat = this.newClassCategory().trim().toUpperCase();
    const wt = this.newClassWeight();
    if (!cat) {
      this.dialog.alert('Please enter an assessment category name.', 'Missing Category', 'warning');
      return;
    }
    const exists = this.classColumns().some(c => c.category === cat);
    if (exists) {
      this.dialog.alert(`Category "${cat}" already exists in this class configuration.`, 'Duplicate Category', 'warning');
      return;
    }
    this.classColumns.update(cols => [...cols, { category: cat, weight: wt }]);
    this.newClassCategory.set('');
    this.newClassWeight.set(10);
  }

  removeClassColumn(index: number) {
    if (this.classColumns().length <= 1) {
      this.dialog.alert('At least one assessment category column is required.', 'Cannot Remove', 'warning');
      return;
    }
    this.classColumns.update(cols => cols.filter((_, i) => i !== index));
  }

  saveClassWeights() {
    const classId = this.selectedClassId();
    if (!classId) return;

    const total = this.totalClassWeight();
    if (total !== 100) {
      this.dialog.alert(`Total assessment weight must equal exactly 100%. Currently it is ${total}%.`, 'Invalid Weights', 'danger');
      return;
    }

    this.isSavingClass.set(true);
    const payload: GradeWeight[] = this.classColumns().map(c => ({
      class_id: classId,
      category: c.category.trim().toUpperCase(),
      weight: c.weight / 100
    }));

    this.gradeService.updateClassWeights(classId, payload).subscribe({
      next: () => {
        this.isSavingClass.set(false);
        this.isClassInherited.set(false);
        this.dialog.alert(`Grading columns for ${this.selectedClassName()} saved successfully.`, 'Class Configuration Saved', 'success');
        this.loadClassWeights(classId);
      },
      error: (err) => {
        this.isSavingClass.set(false);
        this.dialog.alert(err.error?.error || 'Failed to save class weights.', 'Save Failed', 'danger');
      }
    });
  }

  resetClassToGeneralDefault() {
    const classId = this.selectedClassId();
    if (!classId) return;

    this.dialog.confirm(
      `Are you sure you want to reset "${this.selectedClassName()}" to the General School Default configuration? Custom weights will be deleted.`,
      'Reset to General Default',
      'warning',
      'Reset Configuration'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.isSavingClass.set(true);
        this.gradeService.resetClassWeights(classId).subscribe({
          next: () => {
            this.isSavingClass.set(false);
            this.isClassInherited.set(true);
            this.loadClassWeights(classId);
            this.dialog.alert(`"${this.selectedClassName()}" has been reset to inherit the General School Default grading configuration.`, 'Reset Successful', 'success');
          },
          error: (err) => {
            this.isSavingClass.set(false);
            this.dialog.alert(err.error?.error || 'Failed to reset class weights.', 'Error', 'danger');
          }
        });
      }
    });
  }

  // --- Academic Term Finalization & Global Locking ---
  loadAcademicTerms() {
    this.isLoadingTerms.set(true);
    this.apService.getActive().subscribe({
      next: (period) => {
        this.activePeriod.set(period);
        if (period && period.terms) {
          this.terms.set(period.terms);
        } else {
          this.terms.set([]);
        }
        this.isLoadingTerms.set(false);
      },
      error: () => {
        this.isLoadingTerms.set(false);
      }
    });
  }

  onToggleTermLock(term: AcademicTerm) {
    if (!term || !term.id) return;

    const action = term.is_locked ? 'UNLOCK' : 'LOCK';
    const message = term.is_locked
      ? `Are you sure you want to UNLOCK ${term.name}? All teachers will regain permission to enter and edit grades.`
      : `Are you sure you want to LOCK ${term.name}? All teachers across the entire school will be blocked from modifying or saving scores for this term. Grades will remain viewable in read-only mode for reports.`;

    this.dialog.confirm(message, `${action === 'LOCK' ? 'Lock' : 'Unlock'} Term across School`, action === 'LOCK' ? 'warning' : 'info').subscribe((confirmed) => {
      if (!confirmed) return;

      this.isTogglingLock.set(term.id);
      this.apService.toggleTermLock(term.id).subscribe({
        next: () => {
          this.isTogglingLock.set(null);
          this.terms.update(list => list.map(t => t.id === term.id ? { ...t, is_locked: !t.is_locked } : t));
          const isNowLocked = !term.is_locked;
          this.dialog.alert(
            isNowLocked
              ? `${term.name} is now LOCKED across the entire school. Teacher score entries are disabled.`
              : `${term.name} is now UNLOCKED. Teachers can record grades.`,
            isNowLocked ? 'Term Finalized & Locked' : 'Term Unlocked',
            isNowLocked ? 'warning' : 'success'
          );
        },
        error: (err) => {
          this.isTogglingLock.set(null);
          this.dialog.alert(err.error?.error || 'Failed to update term lock status.', 'Error', 'danger');
        }
      });
    });
  }
}
