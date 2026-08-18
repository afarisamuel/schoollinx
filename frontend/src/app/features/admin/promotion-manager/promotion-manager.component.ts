import { Component, OnInit, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { Student } from '../../../core/domain/student.model';

@Component({
  selector: 'app-promotion-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-manager.component.html',
  styleUrl: './promotion-manager.component.css'
})
export class PromotionManagerComponent implements OnInit {
  private studentService = inject(StudentService);
  private classService = inject(ClassService);
  private slService = inject(ScholasticLevelService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  students = signal<Student[]>([]);
  classes = signal<Class[]>([]);
  scholasticLevels = signal<ScholasticLevel[]>([]);
  
  selectedLevel = signal<any>(1);
  selectedClassId = signal<string>('all');
  selectedStudentIds = new Set<string>();
  searchQuery = signal<string>('');
  
  nextAcademicYear = signal<string>('');
  nextClassId = signal<string>('');
  
  isPromoting = signal(false);
  promotionMessage = signal('');
  showConfirm = signal(false);

  maxLevelOrdinal = computed(() => {
    const levels = this.scholasticLevels();
    if (levels.length === 0) return 3; // Legacy default
    return Math.max(...levels.map(l => l.ordinal));
  });

  filteredStudents = computed(() => {
    const students = this.students();
    const targetOrdinal = Number(this.selectedLevel());
    const query = this.searchQuery().trim().toLowerCase();
    
    return students.filter((s: Student) => {
      const matchLevel = s.level === targetOrdinal;
      const matchClass = this.selectedClassId() === 'all' || s.class_id === this.selectedClassId();
      const matchSearch = !query || 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
        (s.enrollment_num?.toLowerCase().includes(query) ?? false);
      return matchLevel && matchClass && matchSearch;
    });
  });

  ngOnInit() {
    if (this.isBrowser) {
      this.loadData();
      this.setDefaultNextYear();
    }
  }

  loadData() {
    this.studentService.getStudents().subscribe((data: Student[]) => this.students.set(data));
    this.classService.getClasses().subscribe((data: Class[]) => this.classes.set(data));
    this.slService.getAll().subscribe((data) => {
      this.scholasticLevels.set(data);
      if (data.length > 0 && !this.selectedLevel()) {
        this.selectedLevel.set(data[0].ordinal);
      }
    });
  }

  setDefaultNextYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    this.nextAcademicYear.set(`${currentYear}/${currentYear + 1}`);
  }

  toggleSelection(id: string) {
    if (this.selectedStudentIds.has(id)) {
      this.selectedStudentIds.delete(id);
    } else {
      this.selectedStudentIds.add(id);
    }
  }

  selectAll() {
    this.filteredStudents().forEach((s: Student) => {
        if (s.id) this.selectedStudentIds.add(s.id);
    });
  }

  clearSelection() {
    this.selectedStudentIds.clear();
  }

  getClassName(classId?: string): string {
    if (!classId) return 'Unassigned';
    const cls = this.classes().find(c => c.id === classId);
    return cls?.name ?? 'Unknown Class';
  }

  getLevelName(ordinal: number): string {
    const level = this.scholasticLevels().find(l => l.ordinal === ordinal);
    return level?.name ?? `Level ${ordinal}`;
  }

  confirmPromote() {
    if (this.selectedStudentIds.size === 0 || !this.nextAcademicYear()) return;
    this.showConfirm.set(true);
  }

  promote() {
    if (this.selectedStudentIds.size === 0) return;
    
    this.showConfirm.set(false);
    this.isPromoting.set(true);
    const ids = Array.from(this.selectedStudentIds);
    const classId = this.nextClassId() === '' ? undefined : this.nextClassId();

    this.studentService.promoteStudents(ids, this.nextAcademicYear(), classId).subscribe({
      next: () => {
        this.promotionMessage.set(`Successfully promoted ${ids.length} student(s) to ${this.getLevelName(Number(this.selectedLevel()) + 1)}.`);
        this.selectedStudentIds.clear();
        this.loadData();
        this.isPromoting.set(false);
      },
      error: (err: any) => {
        this.promotionMessage.set(`Error: ${err.error?.error || 'Failed to promote students'}`);
        this.isPromoting.set(false);
      }
    });
  }
}
