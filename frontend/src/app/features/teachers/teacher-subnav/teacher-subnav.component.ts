import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-subnav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: ``,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TeacherSubnavComponent {
  navLinks = [
    { route: '/teachers/portal', label: 'Gradebook', icon: 'fas fa-graduation-cap', iconColor: 'text-blue-400', exact: true },
    { route: '/teachers/lessons', label: 'Lesson Schemes', icon: 'fas fa-book-open', iconColor: 'text-emerald-400', exact: false },
    { route: '/teachers/seating', label: 'Seating & Roll-Call', icon: 'fas fa-chair', iconColor: 'text-blue-400', exact: false },
    { route: '/teachers/timetable', label: 'Timetable', icon: 'fas fa-calendar-alt', iconColor: 'text-blue-400', exact: false },
    { route: '/teachers/homework', label: 'Homework Studio', icon: 'fas fa-tasks', iconColor: 'text-amber-400', exact: false },
    { route: '/teachers/cbt-builder', label: 'CBT Exam Builder', icon: 'fas fa-laptop-code', iconColor: 'text-rose-400', exact: false },
    { route: '/teachers/consultations', label: 'Consultations', icon: 'fas fa-handshake', iconColor: 'text-cyan-400', exact: false },
    { route: '/teachers/cover-board', label: 'Cover Board', icon: 'fas fa-people-arrows', iconColor: 'text-yellow-400', exact: false },
    { route: '/teachers/conduct', label: 'Student Conduct', icon: 'fas fa-clipboard-list', iconColor: 'text-orange-400', exact: false },
    { route: '/teachers/sickbay', label: 'Sickbay Referrals', icon: 'fas fa-clinic-medical', iconColor: 'text-rose-400', exact: false },
    { route: '/teachers/notices', label: 'Announcements', icon: 'fas fa-bullhorn', iconColor: 'text-pink-400', exact: false },
    { route: '/teachers/ai-copilot', label: 'AI Co-Pilot', icon: 'fas fa-robot', iconColor: 'text-blue-400', exact: false },
    { route: '/teachers/hr-vault', label: 'HR & Payslips', icon: 'fas fa-file-invoice-dollar', iconColor: 'text-emerald-400', exact: false }
  ];
}
