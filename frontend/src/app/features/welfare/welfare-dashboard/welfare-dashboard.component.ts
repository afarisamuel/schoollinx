import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WelfareService } from '../../../core/infrastructure/welfare/welfare.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { HealthRecord, BehaviorLog } from '../../../core/domain/welfare.model';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-welfare-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterModule],
  templateUrl: './welfare-dashboard.component.html',
  styleUrl: './welfare-dashboard.component.css'
})
export class WelfareDashboardComponent implements OnInit {
  private welfareService = inject(WelfareService);
  private studentService = inject(StudentService);
  private dialog = inject(DialogService);

  activeTab = signal<'health' | 'behavior' | 'emergency'>('health');
  searchStudentId = signal<string>('');
  studentSearchQuery = signal<string>('');
  selectedClassFilter = signal<string>('ALL');
  behaviorFilter = signal<'ALL' | 'MERIT' | 'DEMERIT'>('ALL');

  students = signal<Student[]>([]);
  isLoadingStudents = signal<boolean>(false);
  isLoadingRecords = signal<boolean>(false);
  isSavingHealth = signal<boolean>(false);
  isSavingBehavior = signal<boolean>(false);
  
  // Selected Student
  selectedStudent = computed(() => {
    const id = this.searchStudentId();
    if (!id) return null;
    return this.students().find(s => s.id === id) || null;
  });

  // Health Data
  currentHealthRecord = signal<HealthRecord | null>(null);
  isEditingHealth = signal<boolean>(false);
  healthForm = signal<Partial<HealthRecord>>({});
  
  // Behavior Data
  behaviorLogs = signal<BehaviorLog[]>([]);
  isAddingBehavior = signal<boolean>(false);
  behaviorForm = signal<Partial<BehaviorLog>>({ type: 'MERIT', category: 'Academic Excellence' });

  // Quick preset categories
  meritCategories = ['Academic Excellence', 'Civic Leadership', 'Outstanding Effort', 'Peer Assistance', 'Integrity & Honesty', 'Sportsmanship'];
  demeritCategories = ['Classroom Disruption', 'Lateness & Truancy', 'Uniform Violation', 'Insubordination', 'Incomplete Assignments', 'Property Misuse'];

  // Computed classes from students
  availableClasses = computed(() => {
    const set = new Set<string>();
    this.students().forEach(s => {
      const clsName = s.class_name || (s.class as any)?.name;
      if (clsName) set.add(clsName);
    });
    return Array.from(set);
  });

  // Filtered Students for Directory Sidebar / Grid
  filteredStudents = computed(() => {
    const q = this.studentSearchQuery().toLowerCase().trim();
    const cls = this.selectedClassFilter();

    return this.students().filter(s => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const adm = (s.enrollment_num || '').toLowerCase();
      const clsName = s.class_name || (s.class as any)?.name || '';

      const matchesSearch = !q || fullName.includes(q) || adm.includes(q);
      const matchesClass = cls === 'ALL' || clsName === cls;

      return matchesSearch && matchesClass;
    });
  });

  // Filtered Conduct Logs
  filteredBehaviorLogs = computed(() => {
    const filter = this.behaviorFilter();
    const logs = this.behaviorLogs();
    if (filter === 'ALL') return logs;
    return logs.filter(l => l.type === filter);
  });

  // Telemetry Counts
  meritCount = computed(() => this.behaviorLogs().filter(l => l.type === 'MERIT').length);
  demeritCount = computed(() => this.behaviorLogs().filter(l => l.type === 'DEMERIT').length);
  netConductScore = computed(() => (this.meritCount() * 10) - (this.demeritCount() * 5));

  ngOnInit(): void {
    this.loadAllStudents();
  }

  loadAllStudents() {
    this.isLoadingStudents.set(true);
    this.studentService.getStudents().subscribe({
      next: (data) => {
        const list = data || [];
        this.students.set(list);
        this.isLoadingStudents.set(false);
        // Preselect first student if none selected
        if (!this.searchStudentId() && list.length > 0) {
          this.selectStudent(list[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load students:', err);
        this.isLoadingStudents.set(false);
      }
    });
  }

  selectStudent(student: Student) {
    if (!student.id) return;
    this.searchStudentId.set(student.id);
    this.loadStudentWelfareData(student.id);
  }

  searchStudent() {
    const id = this.searchStudentId();
    if (id) {
      this.loadStudentWelfareData(id);
    }
  }

  loadStudentWelfareData(studentId: string) {
    this.isLoadingRecords.set(true);
    this.isEditingHealth.set(false);

    this.welfareService.getStudentHealth(studentId).subscribe({
      next: (record) => {
        this.currentHealthRecord.set(record);
        this.healthForm.set({ ...record });
        this.isLoadingRecords.set(false);
      },
      error: () => {
        this.currentHealthRecord.set(null);
        this.healthForm.set({
          student_id: studentId,
          allergies: '',
          medical_conditions: '',
          required_medication: '',
          emergency_contact: '',
          blood_group: ''
        });
        this.isLoadingRecords.set(false);
      }
    });

    this.welfareService.getStudentBehavior(studentId).subscribe({
      next: (logs) => this.behaviorLogs.set(logs || []),
      error: () => this.behaviorLogs.set([])
    });
  }

  setTab(tab: 'health' | 'behavior' | 'emergency') {
    this.activeTab.set(tab);
  }

  // --- Health Actions ---

  editHealth() {
    this.isEditingHealth.set(true);
  }

  cancelEditHealth() {
    this.isEditingHealth.set(false);
    if (this.currentHealthRecord()) {
      this.healthForm.set({ ...this.currentHealthRecord()! });
    }
  }

  saveHealth() {
    const id = this.searchStudentId();
    if (!id) return;

    this.isSavingHealth.set(true);
    const recordToSave: Partial<HealthRecord> = {
      ...this.healthForm(),
      student_id: id
    };

    this.welfareService.updateHealth(recordToSave).subscribe({
      next: (updated) => {
        this.currentHealthRecord.set(updated);
        this.healthForm.set({ ...updated });
        this.isEditingHealth.set(false);
        this.isSavingHealth.set(false);
      },
      error: (err) => {
        this.isSavingHealth.set(false);
        this.dialog.alert(err?.error?.error || 'Failed to update clinical record.', 'Save Error', 'danger');
      }
    });
  }

  // --- Behavior Actions ---

  openAddBehavior(type: 'MERIT' | 'DEMERIT' = 'MERIT') {
    this.behaviorForm.set({
      type,
      student_id: this.searchStudentId(),
      category: type === 'MERIT' ? 'Academic Excellence' : 'Classroom Disruption',
      description: '',
      action_taken: ''
    });
    this.isAddingBehavior.set(true);
  }

  closeAddBehavior() {
    this.isAddingBehavior.set(false);
  }

  saveBehavior() {
    const id = this.searchStudentId();
    if (!id) return;

    if (!this.behaviorForm().description?.trim()) {
      this.dialog.alert('Please provide a brief event description.', 'Missing Details', 'warning');
      return;
    }

    this.isSavingBehavior.set(true);
    const log: Partial<BehaviorLog> = {
      ...this.behaviorForm(),
      student_id: id,
      date: new Date().toISOString()
    };

    this.welfareService.logBehavior(log).subscribe({
      next: () => {
        this.isSavingBehavior.set(false);
        this.isAddingBehavior.set(false);
        this.loadStudentWelfareData(id);
      },
      error: (err) => {
        this.isSavingBehavior.set(false);
        this.dialog.alert(err?.error?.error || 'Failed to record event.', 'Error', 'danger');
      }
    });
  }

  deleteBehavior(logId: string | undefined) {
    if (!logId) return;
    this.dialog.confirm(
      'Are you sure you want to permanently delete this conduct entry?',
      'Delete Conduct Record',
      'danger',
      'Delete'
    ).subscribe(ok => {
      if (ok) {
        this.welfareService.deleteBehavior(logId).subscribe({
          next: () => {
            const id = this.searchStudentId();
            if (id) this.loadStudentWelfareData(id);
          },
          error: (err) => this.dialog.alert(err?.error?.error || 'Failed to delete record.', 'Error', 'danger')
        });
      }
    });
  }

  exportCSV() {
    const student = this.selectedStudent();
    const logs = this.behaviorLogs();
    const health = this.currentHealthRecord();

    const headers = ['Record Type', 'Student Name', 'Admission Number', 'Class', 'Category/Condition', 'Details/Medication', 'Emergency/Action', 'Date'];
    const rows: string[][] = [];

    if (health) {
      rows.push([
        '"HEALTH PROFILE"',
        `"${student?.first_name || ''} ${student?.last_name || ''}"`,
        `"${student?.enrollment_num || ''}"`,
        `"${student?.class_name || ''}"`,
        `"Blood: ${health.blood_group || 'N/A'} | Allergies: ${health.allergies || 'None'}"`,
        `"${health.medical_conditions || 'None'} (Meds: ${health.required_medication || 'None'})"`,
        `"${health.emergency_contact || 'N/A'}"`,
        `"${health.updated_at || ''}"`
      ]);
    }

    logs.forEach(l => {
      rows.push([
        `"CONDUCT (${l.type})"`,
        `"${student?.first_name || ''} ${student?.last_name || ''}"`,
        `"${student?.enrollment_num || ''}"`,
        `"${student?.class_name || ''}"`,
        `"${l.category || ''}"`,
        `"${l.description || ''}"`,
        `"${l.action_taken || 'None'}"`,
        `"${l.date || ''}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `welfare_records_${student?.enrollment_num || 'student'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printReport() {
    window.print();
  }
}

