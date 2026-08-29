import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherSubnavComponent } from '../../teacher-subnav/teacher-subnav.component';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { CampusOpsService } from '../../../../core/infrastructure/campus-ops/campus-ops.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

interface DeskItem {
  desk: number;
  row: number;
  col: number;
  studentId: string | null;
}

@Component({
  selector: 'app-teacher-seating',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherSubnavComponent],
  templateUrl: './teacher-seating.component.html'
})
export class TeacherSeatingComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private campusOps = inject(CampusOpsService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  selectedAssignment = signal<any>(null);
  students = signal<any[]>([]);

  // Seating grid
  seatingRows = signal(4);
  seatingCols = signal(5);
  seatingDesks = signal<DeskItem[]>([]);
  quickAttendanceMap = signal<Record<string, 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT'>>({});

  // Micro-action Modals
  conductStudent = signal<any>(null);
  incidentType = signal('DISRUPTIVE_BEHAVIOUR');
  incidentDesc = signal('');
  incidentAction = signal('VERBAL_WARNING');
  incidentPoints = signal(5);
  isReportingIncident = signal(false);

  sickbayStudent = signal<any>(null);
  sickbaySymptoms = signal('');
  sickbaySeverity = signal('NORMAL');
  isSendingSickbay = signal(false);

  attendanceSummary = computed(() => {
    const map = this.quickAttendanceMap();
    const values = Object.values(map);
    return {
      present: values.filter(v => v === 'PRESENT').length,
      late: values.filter(v => v === 'LATE').length,
      excused: values.filter(v => v === 'EXCUSED').length,
      absent: values.filter(v => v === 'ABSENT').length,
      total: this.students().length
    };
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        this.assignments.set(res.assignments || []);
        if (res.assignments?.length > 0) {
          const first = this.selectedAssignment() || res.assignments[0];
          this.selectAssignment(first);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  selectAssignment(assignment: any) {
    this.selectedAssignment.set(assignment);
    this.isLoading.set(true);

    this.portalService.getClassStudents(assignment.class_id).subscribe({
      next: (sts) => {
        this.students.set(sts || []);
        this.initOrLoadSeating(assignment.class_id, sts || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  initOrLoadSeating(classId: string, sts: any[]) {
    this.portalService.getSeatingChart(classId).subscribe({
      next: (chart) => {
        if (chart?.layout_json) {
          try {
            const parsed = JSON.parse(chart.layout_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.seatingDesks.set(parsed);
              return;
            }
          } catch (e) {}
        }
        this.buildDefaultLayout(sts);
      },
      error: () => this.buildDefaultLayout(sts)
    });
  }

  buildDefaultLayout(sts: any[]) {
    const totalDesks = this.seatingRows() * this.seatingCols();
    const desks: DeskItem[] = [];
    for (let i = 0; i < totalDesks; i++) {
      desks.push({
        desk: i + 1,
        row: Math.floor(i / this.seatingCols()),
        col: i % this.seatingCols(),
        studentId: sts[i]?.id || null
      });
    }
    this.seatingDesks.set(desks);
  }

  getStudentById(id: string | null) {
    if (!id) return null;
    return this.students().find(s => s.id === id);
  }

  setAttendanceStatus(studentId: string, status: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT') {
    this.quickAttendanceMap.update(m => ({ ...m, [studentId]: status }));
  }

  markAllPresent() {
    const next: Record<string, 'PRESENT'> = {};
    for (const s of this.students()) {
      next[s.id] = 'PRESENT';
    }
    this.quickAttendanceMap.set(next);
    this.toast.success('All enrolled students marked present.', 'Roll-Call');
  }

  saveLayout() {
    const assignment = this.selectedAssignment();
    if (!assignment) return;

    this.portalService.saveSeatingChart(assignment.class_id, {
      name: `${assignment.class?.name || 'Class'} Layout`,
      rows: this.seatingRows(),
      columns: this.seatingCols(),
      layout_json: JSON.stringify(this.seatingDesks())
    }).subscribe({
      next: () => this.toast.success('Classroom seating arrangement saved.', 'Layout Saved'),
      error: () => this.toast.error('Failed to save seating arrangement.')
    });
  }

  shuffleDesks() {
    const stIds = this.students().map(s => s.id).sort(() => Math.random() - 0.5);
    const updated = this.seatingDesks().map((desk, idx) => ({
      ...desk,
      studentId: stIds[idx] || null
    }));
    this.seatingDesks.set(updated);
    this.toast.info('Desks randomized randomly.', 'Random Shuffle');
  }

  // Micro-actions
  openConductModal(student: any) {
    this.conductStudent.set(student);
    this.incidentDesc.set('');
    this.incidentType.set('DISRUPTIVE_BEHAVIOUR');
    this.incidentAction.set('VERBAL_WARNING');
    this.incidentPoints.set(5);
  }

  submitConductIncident() {
    const student = this.conductStudent();
    const teacher = this.teacher();
    if (!student || !this.incidentDesc()) {
      this.toast.error('Please provide a description.');
      return;
    }

    this.isReportingIncident.set(true);
    this.campusOps.reportIncident({
      student_id: student.id,
      reported_by_id: teacher?.id,
      incident_date: new Date().toISOString().slice(0, 10),
      incident_type: this.incidentType(),
      description: this.incidentDesc(),
      action_taken: this.incidentAction(),
      points_deducted: this.incidentPoints(),
      status: 'PENDING'
    }).subscribe({
      next: () => {
        this.isReportingIncident.set(false);
        this.conductStudent.set(null);
        this.toast.success(`Behavior note logged for ${student.first_name}.`, 'Incident Logged');
      },
      error: () => {
        this.isReportingIncident.set(false);
        this.toast.error('Failed to record conduct incident.');
      }
    });
  }

  openSickbayModal(student: any) {
    this.sickbayStudent.set(student);
    this.sickbaySymptoms.set('');
    this.sickbaySeverity.set('NORMAL');
  }

  submitSickbay() {
    const student = this.sickbayStudent();
    if (!student || !this.sickbaySymptoms()) {
      this.toast.error('Observed symptoms required.');
      return;
    }

    this.isSendingSickbay.set(true);
    this.portalService.createSickbayReferral({
      student_id: student.id,
      symptoms: this.sickbaySymptoms(),
      severity: this.sickbaySeverity(),
      referral_time: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.isSendingSickbay.set(false);
        this.sickbayStudent.set(null);
        this.toast.success('Sickbay referral dispatched to infirmary nurse.', 'Referral Sent');
      },
      error: () => {
        this.isSendingSickbay.set(false);
        this.toast.error('Failed to send sickbay ticket.');
      }
    });
  }
}
