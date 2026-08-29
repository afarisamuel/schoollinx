import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-subnav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="flex items-center gap-2 overflow-x-auto pb-2 mb-6 custom-scrollbar text-xs font-black uppercase tracking-wider">
      @for (link of navLinks; track link.route) {
        <a [routerLink]="link.route"
           routerLinkActive="bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-500"
           [routerLinkActiveOptions]="{ exact: link.exact }"
           class="px-4 py-2 rounded-2xl bg-bg-secondary text-text-muted hover:text-text-primary border border-border-primary transition-all flex items-center gap-2 shrink-0 cursor-pointer">
          <i [class]="link.icon" [ngClass]="link.iconColor"></i>
          <span>{{ link.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TeacherSubnavComponent {
  navLinks = [
    { route: '/teachers/portal', label: 'Gradebook', icon: 'fas fa-graduation-cap', iconColor: 'text-indigo-400', exact: true },
    { route: '/teachers/lessons', label: 'Lesson Schemes', icon: 'fas fa-book-open', iconColor: 'text-emerald-400', exact: false },
    { route: '/teachers/seating', label: 'Seating & Roll-Call', icon: 'fas fa-chair', iconColor: 'text-purple-400', exact: false },
    { route: '/teachers/timetable', label: 'Timetable', icon: 'fas fa-calendar-alt', iconColor: 'text-blue-400', exact: false },
    { route: '/teachers/homework', label: 'Homework Studio', icon: 'fas fa-tasks', iconColor: 'text-amber-400', exact: false },
    { route: '/teachers/cbt-builder', label: 'CBT Exam Builder', icon: 'fas fa-laptop-code', iconColor: 'text-rose-400', exact: false },
    { route: '/teachers/consultations', label: 'Consultations', icon: 'fas fa-handshake', iconColor: 'text-cyan-400', exact: false },
    { route: '/teachers/cover-board', label: 'Cover Board', icon: 'fas fa-people-arrows', iconColor: 'text-yellow-400', exact: false },
    { route: '/teachers/conduct', label: 'Student Conduct', icon: 'fas fa-clipboard-list', iconColor: 'text-orange-400', exact: false },
    { route: '/teachers/sickbay', label: 'Sickbay Referrals', icon: 'fas fa-clinic-medical', iconColor: 'text-rose-400', exact: false },
    { route: '/teachers/notices', label: 'Announcements', icon: 'fas fa-bullhorn', iconColor: 'text-pink-400', exact: false },
    { route: '/teachers/ai-copilot', label: 'AI Co-Pilot', icon: 'fas fa-robot', iconColor: 'text-indigo-400', exact: false },
    { route: '/teachers/hr-vault', label: 'HR & Payslips', icon: 'fas fa-file-invoice-dollar', iconColor: 'text-emerald-400', exact: false }
  ];
}
