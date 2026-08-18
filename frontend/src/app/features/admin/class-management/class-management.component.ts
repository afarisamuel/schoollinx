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

  classes = signal<Class[]>([]);
  teachers = signal<Teacher[]>([]);
  levels = signal<ScholasticLevel[]>([]);
  loading = signal(true);
  isModalOpen = signal(false);
  isEditMode = signal(false);
  submitting = signal(false);
  searchQuery = signal('');

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
  }

  getTeacherName(id: string): string {
    const t = this.teachers().find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : 'No Assigned Teacher';
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.currentClass = { name: '', teacher_id: '', scholastic_level_id: '' };
    this.isModalOpen.set(true);
  }

  openEditModal(cls: Class) {
    this.isEditMode.set(true);
    this.currentClass = { ...cls };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.currentClass = { name: '', teacher_id: '', scholastic_level_id: '' };
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
    if (this.isEditMode() && this.currentClass.id) {
      this.classService.updateClass(this.currentClass.id, this.currentClass).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.submitting.set(false);
        },
        error: (err) => {
          this.submitting.set(false);
          this.dialog.alert(err.error?.error || 'Failed to update class', 'Error', 'danger');
        }
      });
    } else {
      this.classService.createClass(this.currentClass).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.submitting.set(false);
        },
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
}
