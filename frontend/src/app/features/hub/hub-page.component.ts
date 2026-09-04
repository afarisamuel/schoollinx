import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/infrastructure/auth/auth.service';
import { AcademicPeriodService } from '../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../core/domain/academic-period.model';

export interface HubTile {
  label: string;
  route: string;
  color: string;
  gradient?: string;
  icon?: string;          // SVG path fallback
  iconClass: string;     // FontAwesome class
  roles: string[];       // Who can see it
  category: string;      // Logical grouping
  badge?: string;        // Contextual badge (e.g. "Real-Time", "Core")
  size?: 'normal' | 'wide' | 'large' | 'tall';
  subtitle: string;
}

export interface HubConfig {
  title: string;
  subtitle: string;
  accent: string;
  badge: string;
  iconClass: string;
  tiles: HubTile[];
}

export interface HubNavOption {
  id: string;
  name: string;
  route: string;
  iconClass: string;
  accent: string;
  description: string;
}

@Component({
  selector: 'app-hub-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './hub-page.component.html',
  styleUrl: './hub-page.component.css',
})
export class HubPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private academicPeriodService = inject(AcademicPeriodService);

  hubId = signal<string>('');
  config = signal<HubConfig | null>(null);
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  activePeriod = signal<AcademicPeriod | null>(null);

  userRole = computed(() => this.authService.currentUserValue?.role || 'STUDENT');
  userName = computed(() => this.authService.currentUserValue?.username || 'Executive User');

  // Hub Switcher Tabs
  hubNavs: HubNavOption[] = [
    {
      id: 'academic',
      name: 'Academic Hub',
      route: '/hub/academic',
      iconClass: 'fas fa-graduation-cap',
      accent: '#6366F1',
      description: 'Instruction, grading, timetables & exams'
    },
    {
      id: 'operations',
      name: 'Operations Hub',
      route: '/hub/operations',
      iconClass: 'fas fa-gears',
      accent: '#E11D48',
      description: 'Faculty, logistics, enrollment & POS'
    },
    {
      id: 'connectivity',
      name: 'Connectivity Hub',
      route: '/hub/connectivity',
      iconClass: 'fas fa-tower-broadcast',
      accent: '#0284C7',
      description: 'SMS broadcast, digital library & community'
    },
    {
      id: 'settings',
      name: 'Settings Hub',
      route: '/hub/settings',
      iconClass: 'fas fa-sliders',
      accent: '#64748B',
      description: 'System security, roles & institutional configs'
    }
  ];

  // All Hub Catalog Configurations
  private hubs: Record<string, HubConfig> = {
    academic: {
      title: 'Academic Hub',
      subtitle: 'Classroom Management & Academic Configuration',
      accent: '#6366F1',
      badge: 'Academic Command',
      iconClass: 'fas fa-graduation-cap',
      tiles: [
        {
          label: 'Attendance Tracker',
          route: '/teachers/attendance',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-clipboard-user',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Instructional Operations',
          badge: 'Daily Roll-Call',
          size: 'wide',
          subtitle: 'Mark & monitor daily classroom presence, pupil absences and notify parents'
        },
        {
          label: 'Classroom Grading',
          route: '/teachers/grading',
          color: '#F59E0B',
          gradient: 'from-amber-500/20 to-orange-500/10',
          iconClass: 'fas fa-award',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Instructional Operations',
          badge: 'Continuous Score',
          subtitle: 'Score assignments, evaluate pupil tests and record terminal assessments'
        },
        {
          label: 'Homework Assignments',
          route: '/teachers/homework',
          color: '#6366F1',
          gradient: 'from-indigo-500/20 to-blue-500/10',
          iconClass: 'fas fa-book-open-reader',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Instructional Operations',
          badge: 'Tasks & Prep',
          subtitle: 'Publish coursework, study worksheets and review student submissions'
        },
        {
          label: 'Academic Periods',
          route: '/academic-periods',
          color: '#3B82F6',
          gradient: 'from-blue-500/20 to-cyan-500/10',
          iconClass: 'fas fa-calendar-check',
          roles: ['ADMIN'],
          category: 'Curriculum & Governance',
          badge: 'Terms & Years',
          subtitle: 'Configure academic sessions, terms, semesters and active period locks'
        },
        {
          label: 'Scholastic Levels',
          route: '/scholastic-levels',
          color: '#06B6D4',
          gradient: 'from-cyan-500/20 to-teal-500/10',
          iconClass: 'fas fa-layer-group',
          roles: ['ADMIN'],
          category: 'Curriculum & Governance',
          badge: 'Forms & Tiers',
          subtitle: 'Manage primary, JHS, and SHS grade levels, forms and educational standards'
        },
        {
          label: 'Classes & Streams',
          route: '/classes',
          color: '#EC4899',
          gradient: 'from-pink-500/20 to-rose-500/10',
          iconClass: 'fas fa-chalkboard-user',
          roles: ['ADMIN'],
          category: 'Curriculum & Governance',
          badge: 'Roster Divs',
          subtitle: 'Configure class divisions, streams, homerooms and assigned form masters'
        },
        {
          label: 'Course Catalog & Subjects',
          route: '/subjects',
          color: '#14B8A6',
          gradient: 'from-teal-500/20 to-emerald-500/10',
          iconClass: 'fas fa-book-bookmark',
          roles: ['ADMIN'],
          category: 'Curriculum & Governance',
          badge: 'Syllabus',
          subtitle: 'Define core subjects, elective courses, syllabus codes and department credits'
        },
        {
          label: 'Faculty Timetable',
          route: '/timetable',
          color: '#8B5CF6',
          gradient: 'from-purple-500/20 to-indigo-500/10',
          iconClass: 'fas fa-calendar-days',
          roles: ['TEACHER', 'STUDENT'],
          category: 'Instructional Operations',
          badge: 'Weekly Roster',
          subtitle: 'Interactive weekly schedule, period allocations and room assignments'
        },
        {
          label: 'Timetable Manager',
          route: '/timetable/manage',
          color: '#4F46E5',
          gradient: 'from-indigo-600/20 to-blue-500/10',
          iconClass: 'fas fa-table-cells-large',
          roles: ['ADMIN'],
          category: 'Scheduling & Exams',
          badge: 'Master Grid',
          subtitle: 'Construct class master schedules, resolve conflicts and allocate teaching slots'
        },
        {
          label: 'Exam Scheduler',
          route: '/timetable/exams',
          color: '#9333EA',
          gradient: 'from-purple-600/20 to-pink-500/10',
          iconClass: 'fas fa-stopwatch-20',
          roles: ['ADMIN'],
          category: 'Scheduling & Exams',
          badge: 'Auto-Scheduler',
          subtitle: 'Auto-generate examination timetables, invigilation shifts and hall allocations'
        },
        {
          label: 'Exam Management',
          route: '/exams',
          color: '#D946EF',
          gradient: 'from-fuchsia-500/20 to-purple-500/10',
          iconClass: 'fas fa-file-signature',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Scheduling & Exams',
          badge: 'Results & Reports',
          size: 'wide',
          subtitle: 'Define exam papers, grading scales, terminal report generation and transcripts'
        },
        {
          label: 'Academic Assignments',
          route: '/academic-assignment',
          color: '#64748B',
          gradient: 'from-slate-500/20 to-gray-500/10',
          iconClass: 'fas fa-diagram-project',
          roles: ['ADMIN'],
          category: 'Curriculum & Governance',
          badge: 'Course Mapping',
          subtitle: 'Map curriculum courses to scholastic levels and teacher specialists'
        },
        {
          label: 'Learning Path',
          route: '/portal/learning-path',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-compass',
          roles: ['STUDENT'],
          category: 'Student Pathways',
          badge: 'Self-Paced',
          subtitle: 'Personalized student academic progress, competency milestones and goals'
        },
        {
          label: 'My Homework',
          route: '/portal/homework',
          color: '#059669',
          gradient: 'from-emerald-600/20 to-teal-500/10',
          iconClass: 'fas fa-pencil-ruler',
          roles: ['STUDENT'],
          category: 'Student Pathways',
          badge: 'My Submissions',
          subtitle: 'View pending class assignments, download study materials and submit coursework'
        }
      ]
    },
    operations: {
      title: 'Operations Hub',
      subtitle: 'Administrative Controls & Institutional Management',
      accent: '#E11D48',
      badge: 'Operational Command',
      iconClass: 'fas fa-gears',
      tiles: [
        {
          label: 'Advanced Analytics',
          route: '/analytics',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-chart-pie',
          roles: ['ADMIN'],
          category: 'Intelligence & Control',
          badge: 'Predictive KPIs',
          size: 'wide',
          subtitle: 'Institutional heatmaps, demographic telemetry, retention indicators and metrics'
        },
        {
          label: 'Student Welfare',
          route: '/welfare',
          color: '#E11D48',
          gradient: 'from-rose-500/20 to-red-500/10',
          iconClass: 'fas fa-heart-pulse',
          roles: ['ADMIN'],
          category: 'Student Services',
          badge: 'Health & Conduct',
          size: 'wide',
          subtitle: 'Sickbay incident logs, health conditions, allergies and behavioral counseling'
        },
        {
          label: 'Logistics Hub',
          route: '/logistics',
          color: '#F97316',
          gradient: 'from-orange-500/20 to-amber-500/10',
          iconClass: 'fas fa-truck-ramp-box',
          roles: ['ADMIN'],
          category: 'Facilities & Logistics',
          badge: 'Transport & Fleet',
          subtitle: 'Fleet tracking, route allocations, meal plans and supplier distributions'
        },
        {
          label: 'Facility Center',
          route: '/facility',
          color: '#14B8A6',
          gradient: 'from-teal-500/20 to-emerald-500/10',
          iconClass: 'fas fa-building-columns',
          roles: ['ADMIN'],
          category: 'Facilities & Logistics',
          badge: 'Campus Asset',
          subtitle: 'Campus mapping, classroom inventory, visitor logs and maintenance work orders'
        },
        {
          label: 'Faculty Staff Registry',
          route: '/teachers',
          color: '#8B5CF6',
          gradient: 'from-purple-500/20 to-indigo-500/10',
          iconClass: 'fas fa-users-gear',
          roles: ['ADMIN'],
          category: 'Staff & Personnel',
          badge: 'Instructors',
          subtitle: 'Faculty profiles, departmental rosters, employment records and workload balances'
        },
        {
          label: 'Teacher Assignments',
          route: '/teachers/assignments',
          color: '#3B82F6',
          gradient: 'from-blue-500/20 to-cyan-500/10',
          iconClass: 'fas fa-user-check',
          roles: ['ADMIN'],
          category: 'Staff & Personnel',
          badge: 'Class Allocations',
          subtitle: 'Assign instructors to specific class streams, subjects and role permissions'
        },
        {
          label: 'Academic Assignments',
          route: '/academic-assignment',
          color: '#64748B',
          gradient: 'from-slate-500/20 to-gray-500/10',
          iconClass: 'fas fa-diagram-project',
          roles: ['ADMIN'],
          category: 'Staff & Personnel',
          badge: 'Course Mappings',
          subtitle: 'Manage cross-department course allocations and teacher subject specializations'
        },
        {
          label: 'Student Enrollment Studio',
          route: '/student-enrollment',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-user-plus',
          roles: ['ADMIN'],
          category: 'Student Services',
          badge: 'Batch Placement',
          size: 'wide',
          subtitle: 'Stream placement studio, student onboarding, admissions funnel and ID generation'
        },
        {
          label: 'Promotion Manager',
          route: '/promotion-manager',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-arrow-up-right-dots',
          roles: ['ADMIN'],
          category: 'Student Services',
          badge: 'Year-End Roll',
          subtitle: 'End-of-year academic rollover, batch promotions, repeats and graduate alumni'
        },
        {
          label: 'Financial Ledger',
          route: '/fiscal',
          color: '#059669',
          gradient: 'from-emerald-600/20 to-green-500/10',
          iconClass: 'fas fa-file-invoice-dollar',
          roles: ['ADMIN'],
          category: 'Fiscal & Commerce',
          badge: 'Revenue & Fees',
          subtitle: 'Tuition receivables, invoice tracking, payment disbursements and financial reports'
        },
        {
          label: 'Academic Departments',
          route: '/department-management',
          color: '#C026D3',
          gradient: 'from-fuchsia-600/20 to-pink-500/10',
          iconClass: 'fas fa-sitemap',
          roles: ['ADMIN'],
          category: 'Staff & Personnel',
          badge: 'Units & HODs',
          subtitle: 'Organizational faculty units, department heads, budget nodes and staff rosters'
        },
        {
          label: 'Course Catalog',
          route: '/subjects',
          color: '#06B6D4',
          gradient: 'from-cyan-500/20 to-teal-500/10',
          iconClass: 'fas fa-book-open',
          roles: ['ADMIN'],
          category: 'Curriculum',
          badge: 'Subject Matrix',
          subtitle: 'Manage curriculum offerings, course units, electives and credit requirements'
        },
        {
          label: 'Digital Wallet & POS',
          route: '/fiscal/wallet',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-wallet',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Fiscal & Commerce',
          badge: 'Cashless Campus',
          size: 'wide',
          subtitle: 'Cashless canteen ecosystem, prepaid student smart balances and merchant terminals'
        }
      ]
    },
    connectivity: {
      title: 'Connectivity Hub',
      subtitle: 'Communication, Resources & Student Life',
      accent: '#0284C7',
      badge: 'Community Portal',
      iconClass: 'fas fa-tower-broadcast',
      tiles: [
        {
          label: 'Communications Hub',
          route: '/communications/hub',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-bullhorn',
          roles: ['ADMIN'],
          category: 'Broadcasts & Messaging',
          badge: 'SMS & WhatsApp',
          size: 'wide',
          subtitle: 'Multi-channel parent notices, urgent SMS dispatch and attendance alerts'
        },
        {
          label: 'Messaging Center',
          route: '/communications/messages',
          color: '#2563EB',
          gradient: 'from-blue-600/20 to-indigo-500/10',
          iconClass: 'fas fa-comments',
          roles: [],
          category: 'Broadcasts & Messaging',
          badge: 'Direct Inbox',
          size: 'wide',
          subtitle: 'Secure direct parent-teacher communications, faculty threads and inquiries'
        },
        {
          label: 'Digital Library',
          route: '/library',
          color: '#9333EA',
          gradient: 'from-purple-500/20 to-pink-500/10',
          iconClass: 'fas fa-book',
          roles: [],
          category: 'Learning Resources',
          badge: 'E-Books & Loans',
          subtitle: 'Browse digital repository, borrow library books, track returns and reservations'
        },
        {
          label: 'Library Management',
          route: '/library-hub',
          color: '#7C3AED',
          gradient: 'from-violet-600/20 to-purple-500/10',
          iconClass: 'fas fa-book-journal-whills',
          roles: ['ADMIN', 'LIBRARIAN'],
          category: 'Learning Resources',
          badge: 'Catalog Control',
          subtitle: 'Barcode scanning, book acquisitions, overdue fine ledger and circulation audit'
        },
        {
          label: 'Cloud Resources',
          route: '/resources',
          color: '#14B8A6',
          gradient: 'from-teal-500/20 to-cyan-500/10',
          iconClass: 'fas fa-cloud-arrow-up',
          roles: [],
          category: 'Learning Resources',
          badge: 'Past Papers',
          subtitle: 'Download institutional syllabus, past exam questions, handouts and lecture decks'
        },
        {
          label: 'Student Organizations & Clubs',
          route: '/clubs',
          color: '#EA580C',
          gradient: 'from-orange-500/20 to-amber-500/10',
          iconClass: 'fas fa-people-group',
          roles: [],
          category: 'Campus Life',
          badge: 'Extracurricular',
          size: 'wide',
          subtitle: 'Student governance, robotics clubs, debate societies, sports teams and events'
        },
        {
          label: 'Alumni Network',
          route: '/alumni',
          color: '#475569',
          gradient: 'from-slate-600/20 to-gray-500/10',
          iconClass: 'fas fa-user-graduate',
          roles: ['ADMIN', 'TEACHER'],
          category: 'Campus Life',
          badge: 'Graduates',
          subtitle: 'Old student directory, mentorship networks, endowment funds and reunions'
        },
        {
          label: 'Parent Portal',
          route: '/parents',
          color: '#0D9488',
          gradient: 'from-teal-600/20 to-emerald-500/10',
          iconClass: 'fas fa-house-chimney-user',
          roles: ['PARENT', 'ADMIN'],
          category: 'Family Engagement',
          badge: 'Guardian Hub',
          subtitle: 'Comprehensive ward academic progress, terminal report cards and fee statements'
        },
        {
          label: 'House Points & Championship',
          route: '/house-points',
          color: '#EAB308',
          gradient: 'from-yellow-500/20 to-amber-500/10',
          iconClass: 'fas fa-trophy',
          roles: [],
          category: 'Campus Life',
          badge: 'Leaderboard',
          size: 'wide',
          subtitle: 'Live inter-house points tally, sports championships and merit awards'
        },
        {
          label: 'Parent Newsletters',
          route: '/communications/newsletter',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-envelope-open-text',
          roles: ['ADMIN'],
          category: 'Broadcasts & Messaging',
          badge: 'Weekly Digests',
          subtitle: 'Automated weekly school digests, principal updates and term calendars'
        }
      ]
    },
    settings: {
      title: 'Settings Hub',
      subtitle: 'System Configuration & Security',
      accent: '#64748B',
      badge: 'System Governance',
      iconClass: 'fas fa-sliders',
      tiles: [
        {
          label: 'Academic Periods',
          route: '/academic-periods',
          color: '#3B82F6',
          gradient: 'from-blue-500/20 to-indigo-500/10',
          iconClass: 'fas fa-calendar-check',
          roles: ['ADMIN'],
          category: 'Core Setup',
          badge: 'Term Calendars',
          size: 'wide',
          subtitle: 'Manage active academic sessions, term start/end dates and enrollment windows'
        },
        {
          label: 'Scholastic Levels',
          route: '/scholastic-levels',
          color: '#06B6D4',
          gradient: 'from-cyan-500/20 to-teal-500/10',
          iconClass: 'fas fa-layer-group',
          roles: ['ADMIN'],
          category: 'Core Setup',
          badge: 'Grade Tiers',
          subtitle: 'Configure scholastic forms, promotion thresholds and academic levels'
        },
        {
          label: 'Role & Permissions Matrix',
          route: '/role-management',
          color: '#7C3AED',
          gradient: 'from-violet-500/20 to-purple-500/10',
          iconClass: 'fas fa-shield-halved',
          roles: ['ADMIN', 'ECOPOWER_ADMIN'],
          category: 'Access & Security',
          badge: 'RBAC Policy',
          size: 'wide',
          subtitle: 'Granular role definitions, administrative delegation and module permissions'
        },
        {
          label: 'Audit Logs',
          route: '/audit-logs',
          color: '#475569',
          gradient: 'from-slate-600/20 to-gray-500/10',
          iconClass: 'fas fa-clipboard-list',
          roles: ['ADMIN'],
          category: 'Access & Security',
          badge: 'System Trace',
          subtitle: 'Immutable system event logs, security access attempts and data audit trail'
        },
        {
          label: 'Super Admin Console',
          route: '/super-admin',
          color: '#E11D48',
          gradient: 'from-rose-500/20 to-red-500/10',
          iconClass: 'fas fa-crown',
          roles: ['ECOPOWER_ADMIN'],
          category: 'Global Master',
          badge: 'Multi-Tenant',
          size: 'wide',
          subtitle: 'Global platform telemetry, tenant provisioning and master override switches'
        },
        {
          label: 'Department Management',
          route: '/department-management',
          color: '#C026D3',
          gradient: 'from-fuchsia-600/20 to-pink-500/10',
          iconClass: 'fas fa-sitemap',
          roles: ['ADMIN'],
          category: 'Core Setup',
          badge: 'Faculty Units',
          subtitle: 'Manage faculty faculties, departmental hierarchy and reporting lines'
        },
        {
          label: 'Class Management',
          route: '/classes',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-chalkboard-user',
          roles: ['ADMIN'],
          category: 'Core Setup',
          badge: 'Class Streams',
          subtitle: 'Create and configure classroom sections, streams and capacity limits'
        },
        {
          label: 'Course & Subject Settings',
          route: '/subjects',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-book-bookmark',
          roles: ['ADMIN'],
          category: 'Core Setup',
          badge: 'Subject Registry',
          size: 'wide',
          subtitle: 'Global subject catalog, course codes, grading weightings and prerequisites'
        },
        {
          label: 'My Account & Security',
          route: '/profile',
          color: '#14B8A6',
          gradient: 'from-teal-500/20 to-cyan-500/10',
          iconClass: 'fas fa-user-gear',
          roles: [],
          category: 'User Preferences',
          badge: 'Credentials',
          subtitle: 'Account authentication, password reset, 2FA security keys and UI preferences'
        },
        {
          label: 'Fee Structures & Tariffs',
          route: '/fiscal/fees',
          color: '#0D9488',
          gradient: 'from-teal-600/20 to-emerald-500/10',
          iconClass: 'fas fa-file-invoice-dollar',
          roles: ['ADMIN'],
          category: 'Financial Settings',
          badge: 'Billing Tariffs',
          subtitle: 'Configure class tuition rates, optional service fees and installment schedules'
        },
        {
          label: 'Department Budget Config',
          route: '/fiscal/budget',
          color: '#F97316',
          gradient: 'from-orange-500/20 to-amber-500/10',
          iconClass: 'fas fa-scale-balanced',
          roles: ['ADMIN'],
          category: 'Financial Settings',
          badge: 'Fiscal Allocation',
          size: 'wide',
          subtitle: 'Allocate departmental expense caps, procurement limits and fiscal approvals'
        },
        {
          label: 'Campus Rooms & Venues',
          route: '/facility/rooms',
          color: '#0284C7',
          gradient: 'from-sky-500/20 to-blue-500/10',
          iconClass: 'fas fa-door-open',
          roles: ['ADMIN'],
          category: 'Facility Settings',
          badge: 'Venues & Labs',
          subtitle: 'Define science labs, lecture halls, exam centers and seating capacities'
        },
        {
          label: 'Campus Asset Management',
          route: '/facility/assets',
          color: '#8B5CF6',
          gradient: 'from-purple-500/20 to-indigo-500/10',
          iconClass: 'fas fa-boxes-stacked',
          roles: ['ADMIN'],
          category: 'Facility Settings',
          badge: 'Fixed Inventory',
          subtitle: 'Barcode tag fixed equipment, laboratory apparatus and maintenance cycles'
        },
        {
          label: 'HR Policies & Staffing',
          route: '/hr',
          color: '#10B981',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconClass: 'fas fa-id-card-clip',
          roles: ['ADMIN'],
          category: 'Staff & Personnel',
          badge: 'HR Governance',
          size: 'wide',
          subtitle: 'Faculty leave policies, statutory benefits, payroll tiers and appraisals'
        },
        {
          label: 'Logistics & Transit Settings',
          route: '/logistics',
          color: '#F97316',
          gradient: 'from-orange-500/20 to-amber-500/10',
          iconClass: 'fas fa-bus-simple',
          roles: ['ADMIN'],
          category: 'Facility Settings',
          badge: 'Transport Routes',
          subtitle: 'Bus transit stop mapping, meal plan pricing and supplier SLAs'
        },
        {
          label: 'Biometric Gateway Setup',
          route: '/biometrics',
          color: '#0D9488',
          gradient: 'from-teal-600/20 to-emerald-500/10',
          iconClass: 'fas fa-fingerprint',
          roles: ['ADMIN'],
          category: 'Access & Security',
          badge: 'Hardware Sync',
          subtitle: 'Enroll RFID turnstiles, optical fingerprint scanners and gate attendance devices'
        }
      ]
    }
  };

  visibleTiles = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    const role = this.userRole();
    return cfg.tiles.filter(t => {
      if (role === 'ECOPOWER_ADMIN') return true;
      return t.roles.length === 0 || t.roles.includes(role);
    });
  });

  categories = computed(() => {
    const tiles = this.visibleTiles();
    const set = new Set<string>();
    tiles.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['ALL', ...Array.from(set)];
  });

  filteredTiles = computed(() => {
    let tiles = this.visibleTiles();
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    if (cat !== 'ALL') {
      tiles = tiles.filter(t => t.category === cat);
    }

    if (query) {
      tiles = tiles.filter(t =>
        t.label.toLowerCase().includes(query) ||
        t.subtitle.toLowerCase().includes(query) ||
        (t.badge && t.badge.toLowerCase().includes(query)) ||
        t.category.toLowerCase().includes(query)
      );
    }

    return tiles;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('hubId') || '';
      this.hubId.set(id);
      this.config.set(this.hubs[id] || null);
      this.selectedCategory.set('ALL');
      this.searchQuery.set('');

      if (!this.config()) {
        this.router.navigate(['/dashboard']);
      }
    });

    this.academicPeriodService.getActive().subscribe({
      next: period => this.activePeriod.set(period),
      error: () => {}
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  getTileClass(tile: HubTile): string {
    const classes = ['hub-module-card'];
    if (tile.size === 'wide') classes.push('col-span-1 md:col-span-2');
    return classes.join(' ');
  }
}
