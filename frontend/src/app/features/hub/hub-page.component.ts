import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/infrastructure/auth/auth.service';

interface HubTile {
  label: string;
  route: string;
  color: string;
  icon: string;      // SVG path
  roles: string[];    // Who can see it
  size?: 'normal' | 'wide' | 'large' | 'tall';
  subtitle?: string;
}

interface HubConfig {
  title: string;
  subtitle: string;
  accent: string;
  tiles: HubTile[];
}

@Component({
  selector: 'app-hub-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hub-page.component.html',
  styleUrl: './hub-page.component.css',
})
export class HubPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  hubId = signal<string>('');
  config = signal<HubConfig | null>(null);

  userRole = computed(() => this.authService.currentUserValue?.role || 'STUDENT');

  visibleTiles = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    const role = this.userRole();
    return cfg.tiles.filter(t => {
      if (role === 'ECOPOWER_ADMIN') return true;
      return t.roles.length === 0 || t.roles.includes(role);
    });
  });

  private hubs: Record<string, HubConfig> = {
    academic: {
      title: 'Academic Hub',
      subtitle: 'Classroom Management & Academic Configuration',
      accent: '#5C2D91',
      tiles: [
        {
          label: 'Attendance Tracker',
          route: '/teachers/attendance',
          color: '#00B294',
          icon: 'M15.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6 M16 13H9 M16 17H9',
          roles: ['ADMIN', 'TEACHER'],
          size: 'wide',
          subtitle: 'Mark & view daily attendance'
        },
        {
          label: 'Classroom Grading',
          route: '/teachers/grading',
          color: '#D83B01',
          icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
          roles: ['ADMIN', 'TEACHER'],
          subtitle: 'Score & assess students'
        },
        {
          label: 'Homework Assignments',
          route: '/teachers/homework',
          color: '#107C10',
          icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6.5 18H20 M15 5l-3 3-3-3',
          roles: ['ADMIN', 'TEACHER'],
          subtitle: 'Assign & track homework'
        },
        {
          label: 'Academic Periods',
          route: '/academic-periods',
          color: '#00188F',
          icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
          roles: ['ADMIN'],
          subtitle: 'Terms & semesters'
        },
        {
          label: 'Scholastic Levels',
          route: '/scholastic-levels',
          color: '#0078D7',
          icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
          roles: ['ADMIN'],
          subtitle: 'Grade levels & forms'
        },
        {
          label: 'Faculty Timetable',
          route: '/timetable',
          color: '#4C4A48',
          icon: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
          roles: ['TEACHER', 'STUDENT'],
          subtitle: 'Your weekly schedule'
        },
        {
          label: 'Timetable Manager',
          route: '/timetable/manage',
          color: '#00188F',
          icon: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18 M9 14h6 M9 18h6',
          roles: ['ADMIN'],
          subtitle: 'Create class schedules'
        },
        {
          label: 'Exam Scheduler',
          route: '/timetable/exams',
          color: '#68217A',
          icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
          roles: ['ADMIN'],
          subtitle: 'Auto-generate exam timetables'
        },
        {
          label: 'Exam Management',
          route: '/exams',
          color: '#5C2D91',
          icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 3h6v4H9z M9 12h6 M9 16h4',
          roles: ['ADMIN', 'TEACHER'],
          size: 'wide',
          subtitle: 'Create, schedule & record results'
        },
        {
          label: 'Learning Path',
          route: '/portal/learning-path',
          color: '#00A4EF',
          icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4l-10 10.01L9 11.01',
          roles: ['STUDENT'],
          subtitle: 'Your academic journey'
        },
        {
          label: 'My Assignments',
          route: '/portal/homework',
          color: '#107C10',
          icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6.5 18H20',
          roles: ['STUDENT'],
          subtitle: 'Homework & submissions'
        }
      ]
    },
    operations: {
      title: 'Operations Hub',
      subtitle: 'Administrative Controls & Institutional Management',
      accent: '#E81123',
      tiles: [
        {
          label: 'Advanced Analytics',
          route: '/analytics',
          color: '#10b981',
          icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Predictive Heatmaps & KPIs'
        },
        {
          label: 'Student Welfare',
          route: '/welfare',
          color: '#E81123',
          icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Health & behavioral tracking'
        },
        {
          label: 'Logistics Hub',
          route: '/logistics',
          color: '#D83B01',
          icon: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2',
          roles: ['ADMIN'],
          subtitle: 'Transport & meals'
        },
        {
          label: 'Facility Center',
          route: '/facility',
          color: '#00B294',
          icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
          roles: ['ADMIN'],
          subtitle: 'Inventory & visitors'
        },
        {
          label: 'Faculty Staff',
          route: '/teachers',
          color: '#5C2D91',
          icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
          roles: ['ADMIN'],
          subtitle: 'Manage teaching staff'
        },
        {
          label: 'Faculty Allocation',
          route: '/teacher-assignments',
          color: '#00188F',
          icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
          roles: ['ADMIN'],
          subtitle: 'Assign teachers to classes'
        },
        {
          label: 'Academic Assignments',
          route: '/academic-assignment',
          color: '#4C4A48',
          icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8z M9 14h6 M9 18h6',
          roles: ['ADMIN'],
          subtitle: 'Course mappings'
        },
        {
          label: 'Student Enrollment',
          route: '/student-enrollment',
          color: '#107C10',
          icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Admit & register students'
        },
        {
          label: 'Promotion Manager',
          route: '/promotion-manager',
          color: '#0078D7',
          icon: 'M13 10l4-4-4-4 M17 6H3 M11 14l-4 4 4 4 M7 18h14',
          roles: ['ADMIN'],
          subtitle: 'Year-end promotions'
        },
        {
          label: 'Financial Ledger',
          route: '/fiscal',
          color: '#008272',
          icon: 'M2 5h20v14H2z M2 10h20',
          roles: ['ADMIN'],
          subtitle: 'Fees, invoices & revenue'
        },
        {
          label: 'Departments',
          route: '/department-management',
          color: '#B4009E',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75',
          roles: ['ADMIN'],
          subtitle: 'Organizational units'
        },
        {
          label: 'Course Catalog',
          route: '/subjects',
          color: '#00A4EF',
          icon: 'M3 4h18v18H3z M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01',
          roles: ['ADMIN'],
          subtitle: 'Subjects & electives'
        },
        {
          label: 'Digital Wallet',
          route: '/fiscal/wallet',
          color: '#10b981',
          icon: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm3-6H4V8h14v4z',
          roles: ['ADMIN', 'TEACHER'],
          size: 'wide',
          subtitle: 'Cashless ecosystem & canteen'
        }
      ]
    },
    connectivity: {
      title: 'Connectivity Hub',
      subtitle: 'Communication, Resources & Student Life',
      accent: '#00A4EF',
      tiles: [
        {
          label: 'Communications Hub',
          route: '/communications/hub',
          color: '#00A4EF',
          icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Notices, Reminders & SMS'
        },
        {
          label: 'Messaging Center',
          route: '/communications/messages',
          color: '#0078D7',
          icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
          roles: [],
          size: 'wide',
          subtitle: 'Internal communications'
        },
        {
          label: 'Digital Library',
          route: '/library',
          color: '#68217A',
          icon: 'M16 6l4 14 M12 6v14 M8 8v12 M4 4v16 M4 20h16',
          roles: [],
          subtitle: 'Browse & borrow'
        },
        {
          label: 'Library Management',
          route: '/library-hub',
          color: '#5C2D91',
          icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6.5 18H20 M12 6v10',
          roles: ['ADMIN', 'LIBRARIAN'],
          subtitle: 'Catalog & circulation'
        },
        {
          label: 'Cloud Resources',
          route: '/resources',
          color: '#00B294',
          icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
          roles: [],
          subtitle: 'Documents & materials'
        },
        {
          label: 'Student Organizations',
          route: '/clubs',
          color: '#D83B01',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75',
          roles: [],
          size: 'wide',
          subtitle: 'Clubs & extracurriculars'
        },
        {
          label: 'Alumni Network',
          route: '/alumni',
          color: '#4C4A48',
          icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M9 12l2 2 4-4',
          roles: ['ADMIN', 'TEACHER'],
          subtitle: 'Graduate connections'
        },
        {
          label: 'Parent Portal',
          route: '/parents',
          color: '#008272',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75',
          roles: ['PARENT', 'ADMIN'],
          subtitle: 'Guardian Dashboard'
        },
        {
          label: 'House Points',
          route: '/house-points',
          color: '#FFB900',
          icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
          roles: [],
          size: 'wide',
          subtitle: 'Championship Leaderboard'
        },
        {
          label: 'Parent Newsletters',
          route: '/communications/newsletter',
          color: '#00A4EF',
          icon: 'M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6z M22 10l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10',
          roles: ['ADMIN'],
          subtitle: 'Automated weekly reports'
        }
      ]
    },
    settings: {
      title: 'Settings Hub',
      subtitle: 'System Configuration & Security',
      accent: '#4B5563',
      tiles: [
        {
          label: 'Academic Periods',
          route: '/academic-periods',
          color: '#00188F',
          icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Manage terms & semesters'
        },
        {
          label: 'Scholastic Levels',
          route: '/scholastic-levels',
          color: '#0078D7',
          icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
          roles: ['ADMIN'],
          subtitle: 'Manage forms/grades'
        },
        {
          label: 'Role Management',
          route: '/role-management',
          color: '#5C2D91',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
          roles: ['ADMIN', 'ECOPOWER_ADMIN'],
          size: 'wide',
          subtitle: 'Permissions matrix'
        },
        {
          label: 'Audit Logs',
          route: '/audit-logs',
          color: '#4C4A48',
          icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
          roles: ['ADMIN'],
          subtitle: 'System activity tracking'
        },
        {
          label: 'Super Admin',
          route: '/super-admin',
          color: '#E81123',
          icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
          roles: ['ECOPOWER_ADMIN'],
          size: 'wide',
          subtitle: 'Global system controls'
        },
        {
          label: 'Department Management',
          route: '/department-management',
          color: '#B4009E',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75',
          roles: ['ADMIN'],
          subtitle: 'Manage faculty units'
        },
        {
          label: 'Class Management',
          route: '/classes',
          color: '#00A4EF',
          icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
          roles: ['ADMIN'],
          subtitle: 'Create & manage classes'
        },
        {
          label: 'Course Settings',
          route: '/subjects',
          color: '#107C10',
          icon: 'M3 4h18v18H3z M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Global subject catalog'
        },
        {
          label: 'My Profile',
          route: '/profile',
          color: '#00B294',
          icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
          roles: [],
          subtitle: 'Account & Security'
        },
        {
          label: 'Fee Structures',
          route: '/fiscal/fees',
          color: '#008272',
          icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
          roles: ['ADMIN'],
          subtitle: 'Configure billing'
        },
        {
          label: 'Budget Config',
          route: '/fiscal/budget',
          color: '#D83B01',
          icon: 'M2 5h20v14H2z M2 10h20',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Allocate department budgets'
        },
        {
          label: 'Facility Rooms',
          route: '/facility/rooms',
          color: '#00A4EF',
          icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
          roles: ['ADMIN'],
          subtitle: 'Campus mapping'
        },
        {
          label: 'Asset Management',
          route: '/facility/assets',
          color: '#5C2D91',
          icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
          roles: ['ADMIN'],
          subtitle: 'School inventory'
        },
        {
          label: 'HR Configurations',
          route: '/hr',
          color: '#107C10',
          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'Staff & payroll policies'
        },
        {
          label: 'Logistics Config',
          route: '/logistics',
          color: '#D83B01',
          icon: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2',
          roles: ['ADMIN'],
          subtitle: 'Transport & meals'
        },
        {
          label: 'Library Admin',
          route: '/library-hub',
          color: '#B4009E',
          icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z M6.5 18H20',
          roles: ['ADMIN'],
          subtitle: 'Global library settings'
        },
        {
          label: 'Biometrics Setup',
          route: '/biometrics',
          color: '#008272',
          icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z',
          roles: ['ADMIN'],
          subtitle: 'Fingerprint & FaceID'
        },
        {
          label: 'Communications',
          route: '/communications/hub',
          color: '#0078D7',
          icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
          roles: ['ADMIN'],
          size: 'wide',
          subtitle: 'System notifications'
        }
      ]
    }
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('hubId') || '';
      this.hubId.set(id);
      this.config.set(this.hubs[id] || null);

      if (!this.config()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getTileClass(tile: HubTile): string {
    const classes = ['bento-card', 'animate-bento-in'];
    switch(tile.size) {
      case 'wide': classes.push('bento-wide'); break;
      case 'large': classes.push('bento-large'); break;
      case 'tall': classes.push('bento-tall'); break;
    }
    return classes.join(' ');
  }
}
