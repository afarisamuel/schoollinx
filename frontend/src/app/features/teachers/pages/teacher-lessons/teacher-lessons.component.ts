import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-lessons.component.html'
})
export class TeacherLessonsComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);
  assignments = signal<any[]>([]);
  selectedAssignment = signal<any>(null);
  lessonPlans = signal<any[]>([]);

  newWeek = signal(1);
  newTerm = signal('Term 1');
  newTopic = signal('');
  newObjectives = signal('');
  newCompetencies = signal('');
  newActivities = signal('');
  newHomework = signal('');
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
    const teacherId = this.teacher()?.id;
    if (!teacherId || !assignment?.class_id) {
      this.isLoading.set(false);
      return;
    }

    this.portalService.getLessonPlans(assignment.class_id).subscribe({
      next: (plans) => {
        this.lessonPlans.set(plans || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  submitPlan() {
    const teacher = this.teacher();
    const assignment = this.selectedAssignment();
    if (!teacher || !assignment) {
      this.toast.error('Please select an active class session first.');
      return;
    }
    if (!this.newTopic()) {
      this.toast.error('Please enter a lesson topic.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      teacher_id: teacher.id,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id || assignment.subject?.id,
      week_number: Number(this.newWeek()),
      term: this.newTerm(),
      topic: this.newTopic(),
      objectives: this.newObjectives(),
      competencies: this.newCompetencies(),
      activities: this.newActivities(),
      homework: this.newHomework(),
      status: 'SUBMITTED'
    };

    this.portalService.createLessonPlan(assignment.class_id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.newTopic.set('');
        this.newObjectives.set('');
        this.newCompetencies.set('');
        this.newActivities.set('');
        this.newHomework.set('');
        this.toast.success('Lesson scheme dispatched for HOD approval.', 'Scheme Submitted');
        this.selectAssignment(assignment);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to submit lesson scheme.');
      }
    });
  }
}
