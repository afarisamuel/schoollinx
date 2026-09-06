import { Component, inject, computed, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Role } from '../../../core/domain/user.model';
import { NotificationService } from '../../../core/infrastructure/notifications/notification.service';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
import { toSignal } from '@angular/core/rxjs-interop';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: () => number | string | null;
  roles?: string[];
  exact?: boolean;
  subtitle?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  hubRoute?: string;
  accent?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private tenantProfileService = inject(TenantProfileService);

  isCollapsed = input<boolean>(false);
  isMobileOpen = input<boolean>(false);
  toggleCollapse = output<void>();
  closeMobile = output<void>();

  currentUser = toSignal(this.authService.currentUser$);
  tenantProfile = signal<TenantProfile | null>(null);
  notifications = toSignal(this.notificationService.notifications$, { initialValue: [] });
  isConnected = toSignal(this.notificationService.connected$, { initialValue: false });

  searchQuery = signal<string>('');
  expandedGroups = signal<Record<string, boolean>>({
    overview: true,
    academic: true,
    registry: true,
    finance: false,
    operations: false,
    connectivity: false,
    settings: false,
    // Teacher groups
    teacher_overview: true,
    teacher_classroom: true,
    teacher_care: true,
    teacher_tools: false,
    // Parent groups
    parent_overview: true,
    parent_academics: true,
    parent_finance: true,
    parent_care: false,
    // Student groups
    student_overview: true,
    student_academics: true,
    student_community: true
  });

  unreadNotifCount = computed(() => this.notifications().filter(n => !n.read).length);

  userRole = computed(() => {
    const user = this.currentUser();
    return user?.role || Role.STUDENT;
  });

  isAdmin = computed(() => this.userRole() === Role.ADMIN || this.userRole() === Role.ECOPOWER_ADMIN);
  isTeacher = computed(() => this.userRole() === Role.TEACHER);
  isGuardian = computed(() => (this.userRole() as string) === Role.GUARDIAN || (this.userRole() as string) === 'PARENT');
  isStudent = computed(() => this.userRole() === Role.STUDENT);

  userRoleLabel = computed(() => {
    const role = this.userRole();
    if (role === Role.ECOPOWER_ADMIN) return 'Super Admin';
    if (role === Role.ADMIN) return 'Administrator';
    if (role === Role.TEACHER) return 'Faculty Member';
    if (this.isGuardian()) return 'Parent / Guardian';
    if (role === Role.STUDENT) return 'Student';
    if (role === Role.LIBRARIAN) return 'Librarian';
    return String(role);
  });

  userInitial = computed(() => {
    const user = this.currentUser();
    const firstChar = user?.username?.[0] || user?.email?.[0] || 'U';
    return firstChar.toUpperCase();
  });

  userName = computed(() => {
    return this.currentUser()?.username || this.currentUser()?.email || 'User';
  });

  private isItemVisible(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) return true;
    const role = this.userRole();
    if (role === Role.ECOPOWER_ADMIN) return true;
    return item.roles.some(r => r === role || (r === 'PARENT' && this.isGuardian()));
  }

  // Master definition of navigation groups tailored per role
  rawNavGroups = computed<NavGroup[]>(() => {
    const unread = this.unreadNotifCount();
    const isTeacher = this.isTeacher();
    const isGuardian = this.isGuardian();
    const isStudent = this.isStudent();

    // ─────────────────────────────────────────────────────────────
    // 1. PARENT / GUARDIAN ROLE SIDEBAR NAVIGATION
    // ─────────────────────────────────────────────────────────────
    if (isGuardian) {
      return [
        {
          id: 'parent_overview',
          title: 'PARENT PORTAL',
          accent: '#6366F1',
          items: [
            {
              label: 'Parent Overview',
              route: '/parents',
              exact: true,
              icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
            },
            {
              label: 'Notifications',
              route: '/notifications',
              icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
              badge: () => unread > 0 ? unread : null
            },
            {
              label: 'School Circulars & Notices',
              route: '/parents/notices',
              icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
            }
          ]
        },
        {
          id: 'parent_academics',
          title: "CHILD'S LEARNING",
          accent: '#8B5CF6',
          items: [
            {
              label: 'Academics & Report Cards',
              route: '/parents/academics',
              icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'Homework & Assignments',
              route: '/parents/homework',
              icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
            },
            {
              label: 'Class & Exam Schedule',
              route: '/parents/schedule',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
              label: 'Activities, Badges & Points',
              route: '/parents/activities',
              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            }
          ]
        },
        {
          id: 'parent_finance',
          title: 'FEES & TRANSIT',
          accent: '#10B981',
          items: [
            {
              label: 'School Fees & Statements',
              route: '/parents/finance',
              icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'Live Bus GPS Tracker',
              route: '/parents/transport',
              icon: 'M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM4 9h10v6H4V9zm10 2h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V15H14v-4z'
            },
            {
              label: 'Security Pickup Pass',
              route: '/parents/pickup',
              icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
            }
          ]
        },
        {
          id: 'parent_care',
          title: 'WELLNESS & CONTACT',
          accent: '#EC4899',
          items: [
            {
              label: 'Direct Messaging',
              route: '/communications/messages',
              icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
            },
            {
              label: 'Teacher Consultations',
              route: '/parents/meetings',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            },
            {
              label: 'Leave & Absence Request',
              route: '/parents/absence',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
              label: 'Health & Sickbay Logs',
              route: '/parents/health',
              icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
            },
            {
              label: 'Parent Account Settings',
              route: '/parents/settings',
              icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            }
          ]
        }
      ];
    }

    // ─────────────────────────────────────────────────────────────
    // 2. TEACHER ROLE SIDEBAR NAVIGATION
    // ─────────────────────────────────────────────────────────────
    if (isTeacher) {
      return [
        {
          id: 'teacher_overview',
          title: 'TEACHER OVERVIEW',
          accent: '#6366F1',
          items: [
            {
              label: 'Dashboard',
              route: '/dashboard',
              exact: true,
              icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
            },
            {
              label: 'Teacher Cockpit',
              route: '/teachers/portal',
              exact: true,
              icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
            },
            {
              label: 'Notifications',
              route: '/notifications',
              icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
              badge: () => unread > 0 ? unread : null
            },
            {
              label: 'Staff Room Notices',
              route: '/teachers/notices',
              icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
            }
          ]
        },
        {
          id: 'teacher_classroom',
          title: 'CLASSROOM & ACADEMICS',
          accent: '#8B5CF6',
          items: [
            {
              label: 'Daily Attendance',
              route: '/teachers/attendance',
              icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
            },
            {
              label: 'Classroom Grading',
              route: '/teachers/grading',
              icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'Homework Portal',
              route: '/teachers/homework',
              icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
            },
            {
              label: 'Lesson Planner',
              route: '/teachers/lessons',
              icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
            },
            {
              label: 'CBT Assessment Builder',
              route: '/teachers/cbt-builder',
              icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            },
            {
              label: 'Teacher Timetable',
              route: '/teachers/timetable',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
              label: 'Class Seating Charts',
              route: '/teachers/seating',
              icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
            },
            {
              label: 'Student Conduct & Merits',
              route: '/teachers/conduct',
              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            },
            {
              label: 'Daily Fee Collection',
              route: '/teachers/daily-collection',
              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
            }
          ]
        },
        {
          id: 'teacher_care',
          title: 'STUDENT CARE & WELFARE',
          accent: '#10B981',
          items: [
            {
              label: 'Student Welfare & Health',
              route: '/welfare',
              icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
            },
            {
              label: 'Sickbay Referral',
              route: '/teachers/sickbay',
              icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'Parent Consultations',
              route: '/teachers/consultations',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            },
            {
              label: 'Digital Wallet POS',
              route: '/fiscal/wallet',
              icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
            },
            {
              label: 'House Points',
              route: '/house-points',
              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            }
          ]
        },
        {
          id: 'teacher_tools',
          title: 'INSTRUCTION & HR',
          accent: '#06B6D4',
          items: [
            {
              label: 'AI Teaching Copilot',
              route: '/teachers/ai-copilot',
              icon: 'M13 10V3L4 14h7v7l9-11h-7z'
            },
            {
              label: 'Cover Board & Substitution',
              route: '/teachers/cover-board',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
              label: 'HR Vault & Payslips',
              route: '/teachers/hr-vault',
              icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2'
            },
            {
              label: 'My Attendance Logs',
              route: '/hr/attendance',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'Messaging Center',
              route: '/communications/messages',
              icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
            },
            {
              label: 'Digital Library',
              route: '/library',
              icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
            },
            {
              label: 'Cloud Resources',
              route: '/resources',
              icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
            },
            {
              label: 'Clubs & Orgs',
              route: '/clubs',
              icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            }
          ]
        }
      ];
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STUDENT ROLE SIDEBAR NAVIGATION
    // ─────────────────────────────────────────────────────────────
    if (isStudent) {
      return [
        {
          id: 'student_overview',
          title: 'STUDENT PORTAL',
          accent: '#6366F1',
          items: [
            {
              label: 'Dashboard',
              route: '/dashboard',
              exact: true,
              icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
            },
            {
              label: 'Notifications',
              route: '/notifications',
              icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
              badge: () => unread > 0 ? unread : null
            }
          ]
        },
        {
          id: 'student_academics',
          title: 'ACADEMICS & STUDY',
          accent: '#8B5CF6',
          items: [
            {
              label: 'My Learning Path',
              route: '/portal/learning-path',
              icon: 'M13 10V3L4 14h7v7l9-11h-7z'
            },
            {
              label: 'My Assignments',
              route: '/portal/homework',
              icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
            },
            {
              label: 'Class Timetable',
              route: '/timetable',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            },
            {
              label: 'House Points',
              route: '/house-points',
              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
            }
          ]
        },
        {
          id: 'student_community',
          title: 'COMMUNITY & RESOURCES',
          accent: '#06B6D4',
          items: [
            {
              label: 'Direct Messages',
              route: '/communications/messages',
              icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
            },
            {
              label: 'Digital Library',
              route: '/library',
              icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
            },
            {
              label: 'Cloud Resources',
              route: '/resources',
              icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
            },
            {
              label: 'Clubs & Orgs',
              route: '/clubs',
              icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
              label: 'My Profile',
              route: '/profile',
              icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
            }
          ]
        }
      ];
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ADMINISTRATOR / ECOPOWER_ADMIN INSTITUTIONAL SUITE
    // ─────────────────────────────────────────────────────────────
    return [
      {
        id: 'overview',
        title: 'OVERVIEW',
        accent: '#6366F1',
        items: [
          {
            label: 'Dashboard',
            route: '/dashboard',
            exact: true,
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
          },
          {
            label: 'Notifications',
            route: '/notifications',
            icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
            badge: () => unread > 0 ? unread : null
          },
          {
            label: 'Executive Analytics',
            route: '/analytics',
            roles: ['ADMIN'],
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          }
        ]
      },
      {
        id: 'academic',
        title: 'ACADEMIC HUB',
        hubRoute: '/hub/academic',
        accent: '#8B5CF6',
        items: [
          {
            label: 'Academic Hub Portal',
            route: '/hub/academic',
            exact: true,
            icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          },
          {
            label: 'Classroom Grading',
            route: '/teachers/grading',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          },
          {
            label: 'Assessment & Grading Setup',
            route: '/grading-configuration',
            roles: ['ADMIN'],
            icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
          },
          {
            label: 'Attendance Tracker',
            route: '/teachers/attendance',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
          },
          {
            label: 'Faculty Timetable',
            route: '/timetable',
            exact: true,
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          },
          {
            label: 'Timetable Manager',
            route: '/timetable/manage',
            roles: ['ADMIN'],
            icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
          },
          {
            label: 'Exam Management',
            route: '/exams',
            exact: true,
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          },
          {
            label: 'Exam Scheduler',
            route: '/timetable/exams',
            roles: ['ADMIN'],
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          },
          {
            label: 'Homework & Tasks',
            route: '/teachers/homework',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
          },
          {
            label: 'Academic Periods',
            route: '/academic-periods',
            roles: ['ADMIN'],
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          },
          {
            label: 'Scholastic Levels',
            route: '/scholastic-levels',
            roles: ['ADMIN'],
            icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
          },
          {
            label: 'Classes & Streams',
            route: '/classes',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
          },
          {
            label: 'Course Catalog',
            route: '/subjects',
            roles: ['ADMIN'],
            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
          },
          {
            label: 'Teacher Assignments',
            route: '/teacher-assignments',
            roles: ['ADMIN'],
            icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
          },
          {
            label: 'Course Mappings',
            route: '/academic-assignment',
            roles: ['ADMIN'],
            icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
          }
        ]
      },
      {
        id: 'registry',
        title: 'CORE REGISTRY',
        accent: '#10B981',
        items: [
          {
            label: 'Students Directory',
            route: '/students',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
          },
          {
            label: 'ID Card Studio & Badging',
            route: '/students/id-cards',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2H9.17A3.001 3.001 0 0112 14z'
          },
          {
            label: 'Student Enrollment',
            route: '/student-enrollment',
            roles: ['ADMIN'],
            icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
          },
          {
            label: 'Promotion Manager',
            route: '/promotion-manager',
            roles: ['ADMIN'],
            icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
          },
          {
            label: 'Faculty & Staff',
            route: '/teachers',
            exact: true,
            roles: ['ADMIN'],
            icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
          },
          {
            label: 'Guardians Directory',
            route: '/guardians',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
          },
          {
            label: 'Student Welfare & Health',
            route: '/welfare',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
          },
          {
            label: 'House Points',
            route: '/house-points',
            icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
          }
        ]
      },
      {
        id: 'finance',
        title: 'FINANCE & BILLING',
        accent: '#F59E0B',
        items: [
          {
            label: 'Financial Ledger',
            route: '/fiscal',
            exact: true,
            roles: ['ADMIN'],
            icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          },
          {
            label: 'Fee Structures & Bills',
            route: '/fiscal/fees',
            roles: ['ADMIN'],
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          },
          {
            label: 'Digital Wallet & POS',
            route: '/fiscal/wallet',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
          },
          {
            label: 'Budget Planning',
            route: '/fiscal/budget',
            roles: ['ADMIN'],
            icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'
          },
          {
            label: 'Expense Claims',
            route: '/fiscal/claims',
            roles: ['ADMIN'],
            icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
          },
          {
            label: 'Scholarships & Waivers',
            route: '/fiscal/scholarships',
            roles: ['ADMIN'],
            icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
          },
          {
            label: 'Subscription Billing',
            route: '/fiscal/billing',
            roles: ['ADMIN'],
            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
          }
        ]
      },
      {
        id: 'operations',
        title: 'CAMPUS OPERATIONS',
        hubRoute: '/hub/operations',
        accent: '#EF4444',
        items: [
          {
            label: 'Operations Hub Portal',
            route: '/hub/operations',
            exact: true,
            roles: ['ADMIN'],
            icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          },
          {
            label: 'Biometric Command',
            route: '/biometrics',
            roles: ['ADMIN'],
            icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4'
          },
          {
            label: 'Logistics & Meals',
            route: '/logistics',
            roles: ['ADMIN'],
            icon: 'M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM4 9h10v6H4V9zm10 2h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V15H14v-4z'
          },
          {
            label: 'Campus Facilities',
            route: '/facility',
            exact: true,
            roles: ['ADMIN'],
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
          },
          {
            label: 'Room Booking',
            route: '/facility/rooms',
            roles: ['ADMIN'],
            icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z'
          },
          {
            label: 'Asset Management',
            route: '/facility/assets',
            roles: ['ADMIN'],
            icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
          },
          {
            label: 'HR & Staff Policies',
            route: '/hr',
            roles: ['ADMIN'],
            icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2'
          },
          {
            label: 'Staff Attendance & Time',
            route: '/hr/attendance',
            roles: ['ADMIN'],
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          },
          {
            label: 'Department Units',
            route: '/department-management',
            roles: ['ADMIN'],
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
          }
        ]
      },
      {
        id: 'connectivity',
        title: 'CONNECTIVITY & LIBRARY',
        hubRoute: '/hub/connectivity',
        accent: '#06B6D4',
        items: [
          {
            label: 'Connectivity Hub Portal',
            route: '/hub/connectivity',
            exact: true,
            icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          },
          {
            label: 'Communications Hub',
            route: '/communications/hub',
            roles: ['ADMIN'],
            icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          },
          {
            label: 'Messaging Center',
            route: '/communications/messages',
            icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
          },
          {
            label: 'Parent Newsletters',
            route: '/communications/newsletter',
            roles: ['ADMIN'],
            icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
          },
          {
            label: 'Digital Library',
            route: '/library',
            exact: true,
            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
          },
          {
            label: 'Library Management',
            route: '/library-hub',
            roles: ['ADMIN', 'LIBRARIAN'],
            icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z'
          },
          {
            label: 'Cloud Resources',
            route: '/resources',
            icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
          },
          {
            label: 'Student Clubs & Orgs',
            route: '/clubs',
            icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          },
          {
            label: 'Parent Portal Directory',
            route: '/parents',
            roles: ['GUARDIAN', 'ADMIN'],
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
          },
          {
            label: 'Alumni Network',
            route: '/alumni',
            roles: ['ADMIN', 'TEACHER'],
            icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
          }
        ]
      },
      {
        id: 'settings',
        title: 'SYSTEM & SETTINGS',
        hubRoute: '/hub/settings',
        accent: '#64748B',
        items: [
          {
            label: 'Settings Hub Portal',
            route: '/hub/settings',
            exact: true,
            roles: ['ADMIN', 'ECOPOWER_ADMIN'],
            icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          },
          {
            label: 'Role & Permissions',
            route: '/role-management',
            roles: ['ADMIN', 'ECOPOWER_ADMIN'],
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
          },
          {
            label: 'System Audit Logs',
            route: '/audit-logs',
            roles: ['ADMIN'],
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
          },
          {
            label: 'Course Demand Forecaster',
            route: '/course-demand',
            roles: ['ADMIN'],
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
          },
          {
            label: 'Retention Risk Matrix',
            route: '/retention-risk',
            roles: ['ADMIN'],
            icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          },
          {
            label: 'Super Admin Controls',
            route: '/super-admin',
            roles: ['ECOPOWER_ADMIN'],
            icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'
          },
          {
            label: 'My Profile & Security',
            route: '/profile',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
          }
        ]
      }
    ];
  });

  // Filtered by role and live search query
  filteredNavGroups = computed<NavGroup[]>(() => {
    const raw = this.rawNavGroups();
    const query = this.searchQuery().trim().toLowerCase();

    return raw
      .map(group => {
        const visibleItems = group.items.filter(item => {
          if (!this.isItemVisible(item)) return false;
          if (!query) return true;
          return item.label.toLowerCase().includes(query) || group.title.toLowerCase().includes(query);
        });

        return {
          ...group,
          items: visibleItems
        };
      })
      .filter(group => group.items.length > 0);
  });

  ngOnInit() {
    this.tenantProfileService.getProfile().subscribe({
      next: (profile) => this.tenantProfile.set(profile),
      error: () => {}
    });

    // Restore saved group collapse preferences from localStorage
    try {
      const saved = localStorage.getItem('schoollinx_sidebar_groups');
      if (saved) {
        this.expandedGroups.set({
          ...this.expandedGroups(),
          ...JSON.parse(saved)
        });
      }
    } catch {}

    // Automatically expand group matching active route
    this.autoExpandActiveGroup(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.autoExpandActiveGroup(event.urlAfterRedirects || event.url);
      });
  }

  private autoExpandActiveGroup(url: string) {
    const raw = this.rawNavGroups();
    for (const group of raw) {
      const hasActive = group.items.some(item => this.checkRouteActive(item, url));
      if (hasActive) {
        this.expandedGroups.update(curr => ({ ...curr, [group.id]: true }));
        break;
      }
    }
  }

  isGroupExpanded(groupId: string): boolean {
    if (this.searchQuery().trim().length > 0) return true;
    return this.expandedGroups()[groupId] ?? true;
  }

  toggleGroup(groupId: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    const current = this.isGroupExpanded(groupId);
    const updated = {
      ...this.expandedGroups(),
      [groupId]: !current
    };
    this.expandedGroups.set(updated);
    try {
      localStorage.setItem('schoollinx_sidebar_groups', JSON.stringify(updated));
    } catch {}
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  private checkRouteActive(item: NavItem, currentUrl: string): boolean {
    if (item.exact) {
      return currentUrl === item.route;
    }
    return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
  }

  isItemActive(item: NavItem): boolean {
    return this.checkRouteActive(item, this.router.url);
  }

  onNavClick() {
    if (this.isMobileOpen()) {
      this.closeMobile.emit();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
