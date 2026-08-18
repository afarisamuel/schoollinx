import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { WelfareService } from '../../../core/infrastructure/welfare/welfare.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { HealthRecord, BehaviorLog } from '../../../core/domain/welfare.model';
import { Student } from '../../../core/domain/student.model';

@Component({
  selector: 'app-welfare-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StudentSearchDropdownComponent],
  templateUrl: './welfare-dashboard.component.html',
  styleUrl: './welfare-dashboard.component.css'
})
export class WelfareDashboardComponent implements OnInit {
  private welfareService = inject(WelfareService);
  private studentService = inject(StudentService);

  activeTab = signal<'health' | 'behavior'>('health');
  searchStudentId = signal<string>('');
  students = signal<Student[]>([]);
  
  // Health
  currentHealthRecord = signal<HealthRecord | null>(null);
  isEditingHealth = signal<boolean>(false);
  
  // Behavior
  behaviorLogs = signal<BehaviorLog[]>([]);
  isAddingBehavior = signal<boolean>(false);
  
  // Form models
  healthForm = signal<Partial<HealthRecord>>({});
  behaviorForm = signal<Partial<BehaviorLog>>({ type: 'MERIT' });

  ngOnInit(): void {
    this.studentService.getStudents().subscribe(data => {
      this.students.set(data);
    });
  }

  setTab(tab: 'health' | 'behavior') {
    this.activeTab.set(tab);
  }

  searchStudent() {
    const id = this.searchStudentId();
    if (!id) return;

    this.welfareService.getStudentHealth(id).subscribe({
      next: (record) => {
        this.currentHealthRecord.set(record);
        this.healthForm.set({...record});
        this.isEditingHealth.set(false);
      },
      error: () => {
        this.currentHealthRecord.set(null);
        this.healthForm.set({
          student_id: id,
          allergies: '',
          medical_conditions: '',
          required_medication: '',
          emergency_contact: '',
          blood_group: ''
        });
        this.isEditingHealth.set(true);
      }
    });

    this.welfareService.getStudentBehavior(id).subscribe({
      next: (logs) => this.behaviorLogs.set(logs || []),
      error: () => this.behaviorLogs.set([])
    });
  }

  // --- Health Actions ---

  editHealth() {
    this.isEditingHealth.set(true);
  }

  cancelEditHealth() {
    this.isEditingHealth.set(false);
    if (this.currentHealthRecord()) {
       this.healthForm.set({...this.currentHealthRecord()!});
    }
  }

  saveHealth(event: Event) {
    event.preventDefault();
    const id = this.searchStudentId();
    if (!id) return;
    
    const recordToSave = { ...this.healthForm(), student_id: id };
    
    this.welfareService.updateHealth(recordToSave).subscribe(updated => {
      this.currentHealthRecord.set(updated);
      this.healthForm.set({...updated});
      this.isEditingHealth.set(false);
    });
  }

  // --- Behavior Actions ---

  openAddBehavior() {
    this.behaviorForm.set({ type: 'DEMERIT', student_id: this.searchStudentId() });
    this.isAddingBehavior.set(true);
  }

  closeAddBehavior() {
    this.isAddingBehavior.set(false);
  }

  saveBehavior(event: Event) {
    event.preventDefault();
    const id = this.searchStudentId();
    if (!id) return;
    
    const log = { ...this.behaviorForm(), student_id: id, date: new Date().toISOString() };
    
    this.welfareService.logBehavior(log).subscribe(() => {
      this.isAddingBehavior.set(false);
      this.searchStudent(); // Refresh logs
    });
  }

  deleteBehavior(logId: string | undefined) {
    if (!logId) return;
    if (confirm('Are you sure you want to delete this log?')) {
      this.welfareService.deleteBehavior(logId).subscribe(() => {
        this.searchStudent();
      });
    }
  }
}
