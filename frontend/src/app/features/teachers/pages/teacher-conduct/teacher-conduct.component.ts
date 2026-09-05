import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { CampusOpsService } from '../../../../core/infrastructure/campus-ops/campus-ops.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-conduct',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-conduct.component.html'
})
export class TeacherConductComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private campusOps = inject(CampusOpsService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  selectedAssignment = signal<any>(null);
  students = signal<any[]>([]);
  incidents = signal<any[]>([]);

  selectedStudentId = signal('');
  incidentType = signal('DISRUPTIVE_BEHAVIOUR');
  actionTaken = signal('VERBAL_WARNING');
  pointsDeducted = signal(5);
  description = signal('');
  isSubmitting = signal(false);

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
        if (sts?.length > 0) {
          this.selectedStudentId.set(sts[0].id);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  submitIncident() {
    if (!this.selectedStudentId() || !this.description()) {
      this.toast.error('Student and context description required.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      student_id: this.selectedStudentId(),
      reported_by_id: this.teacher()?.id,
      incident_date: new Date().toISOString().slice(0, 10),
      incident_type: this.incidentType(),
      description: this.description(),
      action_taken: this.actionTaken(),
      points_deducted: Number(this.pointsDeducted()),
      status: 'PENDING'
    };

    this.campusOps.reportIncident(payload).subscribe({
      next: (inc) => {
        this.isSubmitting.set(false);
        this.description.set('');
        this.incidents.update(list => [inc, ...list]);
        this.toast.success('Disciplinary / conduct note successfully saved.', 'Conduct Recorded');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to log conduct incident.');
      }
    });
  }
}
