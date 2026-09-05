import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
import { Student } from '../../../core/domain/student.model';
import { StudentIdCardComponent, IdCardTheme, IdCardTemplate, ID_CARD_THEMES, ID_CARD_TEMPLATES, ThemeConfig, TemplateOption } from '../../../shared/ui/student-id-card/student-id-card.component';
import { BatchIdCardModalComponent } from '../../../shared/ui/batch-id-card/batch-id-card-modal.component';

@Component({
  selector: 'app-id-card-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StudentIdCardComponent, BatchIdCardModalComponent],
  templateUrl: './id-card-studio.component.html',
  styleUrl: './id-card-studio.component.css'
})
export class IdCardStudioComponent implements OnInit {
  private studentService = inject(StudentService);
  private classService = inject(ClassService);
  private tenantService = inject(TenantProfileService);

  // Data Signals
  classes = signal<Class[]>([]);
  students = signal<Student[]>([]);
  selectedClassId = signal<string>('all');
  selectedStudentId = signal<string>('');
  searchQuery = signal<string>('');
  tenantProfile = signal<TenantProfile | null>(null);

  // Customization Signals
  selectedTheme = signal<IdCardTheme>('teal');
  selectedTemplate = signal<IdCardTemplate>('wave');
  showBarcode = signal<boolean>(true);
  showQrCode = signal<boolean>(true);
  showEmergencyContact = signal<boolean>(true);
  showMedicalAlert = signal<boolean>(true);
  isFlipped = signal<boolean>(false);

  // Batch Printing Modal
  isBatchModalOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  themes: ThemeConfig[] = ID_CARD_THEMES;
  templates: TemplateOption[] = ID_CARD_TEMPLATES;

  ngOnInit(): void {
    this.loadClasses();
    this.loadStudents();
    this.loadTenantProfile();
  }

  loadTenantProfile() {
    this.tenantService.getProfile().subscribe({
      next: (profile) => this.tenantProfile.set(profile),
      error: () => {}
    });
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (classes) => this.classes.set(classes || []),
      error: () => {}
    });
  }

  loadStudents() {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students.set(students || []);
        if (students && students.length > 0 && !this.selectedStudentId()) {
          this.selectedStudentId.set(students[0].id || '');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  // Filtered Roster
  filteredStudents = computed(() => {
    let list = this.students();
    const classId = this.selectedClassId();
    const q = this.searchQuery().toLowerCase().trim();

    if (classId !== 'all') {
      list = list.filter(s => s.class_id === classId);
    }

    if (q) {
      list = list.filter(s => {
        const fullName = `${s.first_name || ''} ${s.last_name || ''} ${s.other_name || ''}`.toLowerCase();
        const id = (s.enrollment_num || s.id || '').toLowerCase();
        return fullName.includes(q) || id.includes(q);
      });
    }

    return list;
  });

  // Selected Student Object
  activeStudent = computed(() => {
    const list = this.filteredStudents();
    if (list.length === 0) {
      return this.students()[0] || null;
    }
    const target = list.find(s => s.id === this.selectedStudentId());
    return target || list[0] || null;
  });

  selectStudent(s: Student) {
    if (s.id) {
      this.selectedStudentId.set(s.id);
    }
  }

  setTheme(theme: IdCardTheme) {
    this.selectedTheme.set(theme);
  }

  setTemplate(tpl: IdCardTemplate) {
    this.selectedTemplate.set(tpl);
  }

  toggleFlip() {
    this.isFlipped.set(!this.isFlipped());
  }

  openBatchModal() {
    this.isBatchModalOpen.set(true);
  }

  closeBatchModal() {
    this.isBatchModalOpen.set(false);
  }

  triggerPrint() {
    window.print();
  }
}
