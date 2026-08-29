import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherSubnavComponent } from '../../teacher-subnav/teacher-subnav.component';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';

@Component({
  selector: 'app-teacher-timetable',
  standalone: true,
  imports: [CommonModule, RouterModule, TeacherSubnavComponent],
  templateUrl: './teacher-timetable.component.html'
})
export class TeacherTimetableComponent implements OnInit {
  private portalService = inject(TeacherPortalService);

  isLoading = signal(true);
  timetableEntries = signal<any[]>([]);
  teacher = signal<any>(null);

  daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        if (res.teacher?.id) {
          this.portalService.getTeacherTimetable(res.teacher.id).subscribe({
            next: (entries) => {
              this.timetableEntries.set(entries || []);
              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  getEntriesForDay(dayOfWeek: number) {
    return this.timetableEntries().filter(e => e.day_of_week === dayOfWeek);
  }
}
