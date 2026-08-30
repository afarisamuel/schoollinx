import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';

@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './class-management.component.html',
})
export class ClassManagementComponent implements OnInit {
  private classService = inject(ClassService);
  private teacherService = inject(TeacherService);
  private dialog = inject(DialogService);
  private scholasticLevelService = inject(ScholasticLevelService);
  private subjectService = inject(SubjectService);
  private gradeService = inject(GradeService);

  classes = signal<Class[]>([]);
  teachers = signal<Teacher[]>([]);
  levels = signal<ScholasticLevel[]>([]);
  subjects = signal<Subject[]>([]);
  selectedSubjectIds = signal<string[]>([]);
  loading = signal(true);
  isModalOpen = signal(false);
  isEditMode = signal(false);
  submitting = signal(false);
  searchQuery = signal('');

  // Grading Columns & Weights State (Admin Controlled)
  isGradingModalOpen = signal(false);
  gradingClass = signal<Class | null>(null);
  gradingColumns = signal<{ id?: string; category: string; weight: number }[]>([]);
  isSavingWeights = signal(false);
  totalGradingWeight = computed(() => this.gradingColumns().reduce((sum, c) => sum + (c.weight || 0), 0));

  currentClass: Partial<Class> = { name: '', teacher_id: '', scholastic_level_id: '' };

  filteredClasses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.classes();
    return this.classes().filter(c =>
      c.name.toLowerCase().includes(q) ||
      this.getTeacherName(c.teacher_id).toLowerCase().includes(q)
    );
  });

  classesWithTeacher = computed(() =>
    this.classes().filter(c => c.teacher_id && c.teacher_id !== '').length
  );

  classesWithoutTeacher = computed(() =>
    this.classes().filter(c => !c.teacher_id || c.teacher_id === '').length
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.classService.getClasses().subscribe({
      next: (cls) => {
        this.classes.set(cls || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load classes', err);
        this.loading.set(false);
        this.dialog.alert('Failed to load classes', 'Error', 'danger');
      }
    });

    this.teacherService.getTeachers().subscribe({
      next: (t) => this.teachers.set(t || []),
      error: (err) => console.error('Failed to load teachers', err)
    });

    this.scholasticLevelService.getAll().subscribe({
      next: (l) => this.levels.set(l || []),
      error: (err) => console.error('Failed to load scholastic levels', err)
    });

    this.subjectService.getSubjects().subscribe({
      next: (s) => this.subjects.set(s || []),
      error: (err) => console.error('Failed to load subjects', err)
    });
  }

  getTeacherName(id: string): string {
    const t = this.teachers().find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : 'No Assigned Teacher';
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.currentClass = { name: '', teacher_id: '', scholastic_level_id: '' };
    this.selectedSubjectIds.set([]);
    this.isModalOpen.set(true);
  }

  openEditModal(cls: Class) {
    this.isEditMode.set(true);
    this.currentClass = { ...cls };
    this.selectedSubjectIds.set((cls.subjects || []).map(s => s.id));
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.currentClass = { name: '', teacher_id: '', scholastic_level_id: '' };
    this.selectedSubjectIds.set([]);
  }

  toggleSubject(id: string) {
    const current = this.selectedSubjectIds();
    if (current.includes(id)) {
      this.selectedSubjectIds.set(current.filter(s => s !== id));
    } else {
      this.selectedSubjectIds.set([...current, id]);
    }
  }

  isSubjectSelected(id: string): boolean {
    return this.selectedSubjectIds().includes(id);
  }

  getSubjectName(id: string): string {
    const s = this.subjects().find(s => s.id === id);
    return s ? s.name : id;
  }

  saveClass() {
    if (!this.currentClass.name) {
      this.dialog.alert('Class Name is required.', 'Validation Error', 'warning');
      return;
    }

    if (!this.currentClass.teacher_id) {
      delete this.currentClass.teacher_id;
    }

    if (!this.currentClass.scholastic_level_id) {
      delete this.currentClass.scholastic_level_id;
    }

    this.submitting.set(true);
    const subjectIds = this.selectedSubjectIds();

    const saveSubjects = (classId: string) => {
      this.classService.setClassSubjects(classId, subjectIds).subscribe({
        next: () => { this.loadData(); this.closeModal(); this.submitting.set(false); },
        error: () => { this.loadData(); this.closeModal(); this.submitting.set(false); }
      });
    };

    if (this.isEditMode() && this.currentClass.id) {
      this.classService.updateClass(this.currentClass.id, this.currentClass).subscribe({
        next: (updated) => saveSubjects(updated.id || this.currentClass.id!),
        error: (err) => {
          this.submitting.set(false);
          this.dialog.alert(err.error?.error || 'Failed to update class', 'Error', 'danger');
        }
      });
    } else {
      this.classService.createClass(this.currentClass).subscribe({
        next: (created) => saveSubjects(created.id),
        error: (err) => {
          this.submitting.set(false);
          this.dialog.alert(err.error?.error || 'Failed to create class', 'Error', 'danger');
        }
      });
    }
  }

  deleteClass(id: string) {
    this.dialog.confirm('Are you sure you want to delete this class? This action cannot be undone.', 'Confirm Deletion', 'danger', 'Delete').subscribe((confirmed) => {
      if (confirmed) {
        this.classService.deleteClass(id).subscribe({
          next: () => this.loadData(),
          error: (err) => this.dialog.alert(err.error?.error || 'Failed to delete class', 'Error', 'danger')
        });
      }
    });
  }

  // ── Grading Columns Management (Admin Controlled) ─────────────────
  openGradingColumnsModal(cls: Class) {
    this.gradingClass.set(cls);
    this.gradeService.getGradeWeights(cls.id).subscribe({
      next: (weights) => {
        if (weights && weights.length > 0) {
          this.gradingColumns.set(weights.map(w => ({
            id: w.id,
            category: w.category,
            weight: w.weight > 1 ? Math.round(w.weight) : Math.round(w.weight * 100)
          })));
        } else {
          this.applyGradingPreset('standard');
        }
        this.isGradingModalOpen.set(true);
      },
      error: () => {
        this.applyGradingPreset('standard');
        this.isGradingModalOpen.set(true);
      }
    });
  }

  closeGradingModal() {
    this.isGradingModalOpen.set(false);
    this.gradingClass.set(null);
  }

  addGradingColumn() {
    const current = this.gradingColumns();
    this.gradingColumns.set([
      ...current,
      { category: 'Assessment ' + (current.length + 1), weight: 10 }
    ]);
  }

  removeGradingColumn(index: number) {
    const current = [...this.gradingColumns()];
    current.splice(index, 1);
    this.gradingColumns.set(current);
  }

  applyGradingPreset(preset: 'standard' | 'trimester' | 'continuous') {
    if (preset === 'standard') {
      this.gradingColumns.set([
        { category: 'Class Assessment', weight: 30 },
        { category: 'Final Examination', weight: 70 }
      ]);
    } else if (preset === 'trimester') {
      this.gradingColumns.set([
        { category: 'Homework & Classwork', weight: 20 },
        { category: 'Mid-Term Exam', weight: 30 },
        { category: 'End of Term Exam', weight: 50 }
      ]);
    } else if (preset === 'continuous') {
      this.gradingColumns.set([
        { category: 'Class Tests', weight: 25 },
        { category: 'Project Work', weight: 25 },
        { category: 'Terminal Examination', weight: 50 }
      ]);
    }
  }

  saveGradingColumns() {
    const cls = this.gradingClass();
    if (!cls) return;

    const cols = this.gradingColumns();
    if (cols.length === 0) {
      this.dialog.alert('At least one assessment column is required.', 'Validation Error', 'warning');
      return;
    }

    for (const c of cols) {
      if (!c.category.trim()) {
        this.dialog.alert('All columns must have a valid assessment name.', 'Validation Error', 'warning');
        return;
      }
      if (c.weight <= 0) {
        this.dialog.alert('Column weights must be greater than 0%.', 'Validation Error', 'warning');
        return;
      }
    }

    if (this.totalGradingWeight() !== 100) {
      this.dialog.alert(`Total weight must equal exactly 100%. Current total is ${this.totalGradingWeight()}%.`, 'Invalid Weight Balance', 'warning');
      return;
    }

    this.isSavingWeights.set(true);
    const payload = cols.map(c => ({
      class_id: cls.id,
      category: c.category.trim(),
      weight: c.weight // percentage integer e.g. 30
    }));

    this.gradeService.updateClassWeights(cls.id, payload).subscribe({
      next: () => {
        this.isSavingWeights.set(false);
        this.closeGradingModal();
        this.dialog.alert(`Grading columns and percentage weights for ${cls.name} saved successfully! Teachers will now automatically use these columns in the Speed Gradebook.`, 'Success', 'success');
      },
      error: (err) => {
        this.isSavingWeights.set(false);
        this.dialog.alert(err.error?.error || 'Failed to save grading columns.', 'Error', 'danger');
      }
    });
  }
}
