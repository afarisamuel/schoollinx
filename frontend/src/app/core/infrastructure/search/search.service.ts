import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface SearchResult {
  type: 'action' | 'page' | 'student' | 'teacher' | 'class';
  category: 'action' | 'academic' | 'finance' | 'registry' | 'operations' | 'communication' | 'settings';
  id: string;
  title: string;
  description?: string;
  path: string;
  iconSvg?: string;
  badge?: string;
  keywords?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = `${(environment as any).apiUrl}/search`;

  // Global state to trigger spotlight modal from anywhere (Navbar, hotkeys, etc.)
  isOpen = signal<boolean>(false);

  // Comprehensive institutional navigation & action catalog
  private readonly staticCatalog: SearchResult[] = [
    // ── Quick Actions ────────────────────────────────────────────────────────
    {
      type: 'action',
      category: 'action',
      id: 'act-1',
      title: 'Admit New Student',
      description: 'Register a new pupil or transfer student into a cohort',
      path: '/student-enrollment',
      badge: 'Quick Admit',
      keywords: ['enroll', 'admission', 'register', 'new pupil', 'intake', 'freshman']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-2',
      title: 'Record Class Roll Call',
      description: 'Take daily attendance for active classroom streams',
      path: '/attendance',
      badge: 'Attendance',
      keywords: ['present', 'absent', 'tardy', 'roll call', 'daily register']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-3',
      title: 'Configure School Fee Structure',
      description: 'Define tuition, feeding, bus, and lab bills per term',
      path: '/fiscal/fees',
      badge: 'Billing',
      keywords: ['fees', 'bill', 'tuition structure', 'rates', 'pricing']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-4',
      title: 'Classroom Grading & Score Entry',
      description: 'Enter term test scores, homework marks, and assessments',
      path: '/teachers/grading',
      badge: 'Marks',
      keywords: ['grading', 'scores', 'test', 'exam marks', 'results', 'gpa']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-5',
      title: 'Generate Terminal Report Cards',
      description: 'Compile and print student academic report sheets',
      path: '/academic/reports',
      badge: 'Reports',
      keywords: ['report card', 'terminal report', 'transcripts', 'print grades']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-6',
      title: 'Biometric & RFID Hardware Hub',
      description: 'Scan student RFID cards and fingerprint terminals',
      path: '/biometrics',
      badge: 'Hardware',
      keywords: ['rfid', 'biometric', 'fingerprint', 'scanner', 'smart card']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-7',
      title: 'Class Promotion Manager',
      description: 'Promote students to the next grade level or academic session',
      path: '/promotion-manager',
      badge: 'Transition',
      keywords: ['promote', 'advancement', 'next class', 'level up', 'retention']
    },
    {
      type: 'action',
      category: 'action',
      id: 'act-8',
      title: 'Issue & Return Library Book',
      description: 'Check out books to students and manage catalog loans',
      path: '/library',
      badge: 'Library',
      keywords: ['book loan', 'borrow', 'return', 'textbook', 'isbn']
    },

    // ──  Registry & People ────────────────────────────────────────────────
    {
      type: 'page',
      category: 'registry',
      id: 'reg-1',
      title: 'Student Directory & Roster',
      description: 'Search, filter, and inspect enrolled student profiles',
      path: '/students',
      badge: 'Registry',
      keywords: ['pupils', 'students', 'profiles', 'directory', 'bio', 'ward']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-2',
      title: 'Classes & Streams Management',
      description: 'Configure classrooms, streams, arms, and student capacity',
      path: '/classes',
      badge: 'Classes',
      keywords: ['classrooms', 'form', 'grade', 'streams', 'arms', 'sections']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-3',
      title: 'Faculty & Teacher Registry',
      description: 'Instructor directory, contact details, and staff profiles',
      path: '/teachers',
      badge: 'Faculty',
      keywords: ['teachers', 'staff', 'faculty', 'instructors', 'tutors']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-4',
      title: 'Teacher Teaching Assignments',
      description: 'Map teachers to classes, streams, and specific subjects',
      path: '/teacher-assignments',
      badge: 'Allocation',
      keywords: ['assign teacher', 'subject allocation', 'timetable map']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-5',
      title: 'Guardians & Parent Network',
      description: 'Parent contacts, guardian links, and emergency numbers',
      path: '/guardians',
      badge: 'Parents',
      keywords: ['guardians', 'parents', 'mother', 'father', 'emergency contact']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-6',
      title: 'Academic Class Placement',
      description: 'Assign newly admitted or unassigned students to cohorts',
      path: '/academic-assignment',
      badge: 'Placement',
      keywords: ['class assignment', 'assign cohort', 'stream allocation']
    },
    {
      type: 'page',
      category: 'registry',
      id: 'reg-7',
      title: 'Alumni & Graduate Registry',
      description: 'Historical archive of graduated cohorts and old students',
      path: '/alumni',
      badge: 'Alumni',
      keywords: ['graduates', 'alumni', 'former students', 'old boys', 'old girls']
    },

    // ──  Academics & Curriculum ───────────────────────────────────────────
    {
      type: 'page',
      category: 'academic',
      id: 'acad-1',
      title: 'Command Center Dashboard',
      description: 'Real-time overview of academics, metrics, and operations',
      path: '/dashboard',
      badge: 'Overview',
      keywords: ['home', 'kpi', 'dashboard', 'analytics', 'summary', 'command']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-2',
      title: 'Exam Management & Schedules',
      description: 'Configure mid-term tests, finals, and grading scales',
      path: '/exams',
      badge: 'Exams',
      keywords: ['examinations', 'tests', 'assessment', 'midterm', 'finals', 'waec']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-3',
      title: 'Curriculum & Subjects Hub',
      description: 'Configure academic subjects, syllabus codes, and departments',
      path: '/subjects',
      badge: 'Subjects',
      keywords: ['subjects', 'curriculum', 'courses', 'syllabus', 'departments']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-4',
      title: 'Academic Terms & Session Periods',
      description: 'Manage academic years, semesters, terms, and session calendars',
      path: '/academic-periods',
      badge: 'Calendar',
      keywords: ['terms', 'sessions', 'semester', 'academic year', 'holidays']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-5',
      title: 'Scholastic Levels & Tracks',
      description: 'Configure primary, JHS, SHS, nursery, and kindergarten tiers',
      path: '/scholastic-levels',
      badge: 'Levels',
      keywords: ['levels', 'stages', 'tiers', 'primary', 'secondary', 'jhs', 'shs']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-6',
      title: 'Retention & At-Risk Matrix',
      description: 'AI-driven predictive analytics for student drop-out prevention',
      path: '/retention-risk',
      badge: 'AI Insights',
      keywords: ['at risk', 'retention', 'dropout', 'intervention', 'predictive']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-7',
      title: 'Course Demand Forecaster',
      description: 'Analyze subject enrollments and faculty staffing requirements',
      path: '/course-demand',
      badge: 'Planning',
      keywords: ['course demand', 'staffing', 'capacity planning', 'electives']
    },
    {
      type: 'page',
      category: 'academic',
      id: 'acad-8',
      title: 'Department Management',
      description: 'Organize academic departments (Sciences, Arts, Languages)',
      path: '/department-management',
      badge: 'Departments',
      keywords: ['departments', 'hod', 'faculty heads', 'divisions']
    },

    // ──  Financial Operations ─────────────────────────────────────────────
    {
      type: 'page',
      category: 'finance',
      id: 'fin-1',
      title: 'Fee Collection & Fiscal Hub',
      description: 'Tuition balances, payments, cash deposits, and receipts',
      path: '/fiscal',
      badge: 'Finance',
      keywords: ['money', 'fees', 'payments', 'arrears', 'revenue', 'receipt', 'deposit']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-2',
      title: 'General Accounting Ledger',
      description: 'Double-entry fiscal transactions, income, and balance sheet',
      path: '/fiscal/ledger',
      badge: 'Ledger',
      keywords: ['ledger', 'accounting', 'journal', 'credit', 'debit', 'audit']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-3',
      title: 'Student Scholarships & Waivers',
      description: 'Grant bursaries, need-based fee discounts, and partial waivers',
      path: '/fiscal/scholarships',
      badge: 'Scholarships',
      keywords: ['scholarship', 'bursary', 'waiver', 'discount', 'grant', 'financial aid']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-4',
      title: 'Digital Wallet & Canteen POS',
      description: 'Student prepaid digital balance for tuck shop and cafeteria',
      path: '/fiscal/wallet',
      badge: 'Wallet',
      keywords: ['wallet', 'cashless', 'canteen', 'top up', 'feeding', 'pos']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-5',
      title: 'Institutional Budget Planning',
      description: 'Departmental budget allocations, fiscal targets, and caps',
      path: '/fiscal/budget',
      badge: 'Budget',
      keywords: ['budget', 'expenditure', 'capital', 'forecast', 'fiscal plan']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-6',
      title: 'Expense Claims & Vouchers',
      description: 'Staff expense claims, petty cash disbursements, and approvals',
      path: '/fiscal/claims',
      badge: 'Claims',
      keywords: ['expenses', 'petty cash', 'claims', 'reimbursement', 'vouchers']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-7',
      title: 'Campus Subscription & Billing',
      description: 'SchoolLinx platform license, SMS credits, and renewal billing',
      path: '/fiscal/billing',
      badge: 'Subscription',
      keywords: ['subscription', 'sms credits', 'license', 'plan', 'billing']
    },
    {
      type: 'page',
      category: 'finance',
      id: 'fin-8',
      title: 'Fiscal Intelligence & Revenue Forecast',
      description: 'Revenue collection metrics, fee recovery rate, and projections',
      path: '/fiscal/intelligence',
      badge: 'Revenue AI',
      keywords: ['revenue forecast', 'collection rate', 'bad debt', 'financial ai']
    },

    // ──  Operations, Care & Facilities ────────────────────────────────────
    {
      type: 'page',
      category: 'operations',
      id: 'ops-1',
      title: 'Library & Digital Media Catalog',
      description: 'Book inventory, ISBN catalog, digital resources, and lending',
      path: '/library',
      badge: 'Library',
      keywords: ['books', 'library', 'textbooks', 'ebooks', 'catalog', 'author']
    },
    {
      type: 'page',
      category: 'operations',
      id: 'ops-2',
      title: 'Student Welfare & Health Center',
      description: 'Infirmary records, allergies, incident logs, and health care',
      path: '/welfare',
      badge: 'Welfare',
      keywords: ['infirmary', 'clinic', 'health', 'medical', 'nurse', 'allergies']
    },
    {
      type: 'page',
      category: 'operations',
      id: 'ops-3',
      title: 'Campus Operations & Asset Inventory',
      description: 'Equipment tracking, lab instruments, classroom desks, and assets',
      path: '/operations',
      badge: 'Assets',
      keywords: ['inventory', 'assets', 'equipment', 'supplies', 'repairs']
    },
    {
      type: 'page',
      category: 'operations',
      id: 'ops-4',
      title: 'School Bus & Transport Logistics',
      description: 'Bus routes, student pick-up points, driver tracking, and transit',
      path: '/logistics',
      badge: 'Transport',
      keywords: ['bus', 'transport', 'driver', 'routes', 'fleet', 'transit']
    },
    {
      type: 'page',
      category: 'operations',
      id: 'ops-5',
      title: 'House Points & Leadership Board',
      description: 'Student houses, merit tokens, discipline points, and trophies',
      path: '/house-points',
      badge: 'Houses',
      keywords: ['houses', 'merit', 'points', 'leaderboard', 'conduct', 'discipline']
    },
    {
      type: 'page',
      category: 'operations',
      id: 'ops-6',
      title: 'Extracurricular Clubs & Societies',
      description: 'Student clubs, sports teams, robotics, debate, and music',
      path: '/clubs',
      badge: 'Clubs',
      keywords: ['clubs', 'sports', 'societies', 'debate', 'athletics', 'after school']
    },

    // ──  Communications & Settings ────────────────────────────────────────
    {
      type: 'page',
      category: 'communication',
      id: 'com-1',
      title: 'Notification & Message Center',
      description: 'System alerts, broadcast queue, parent SMS, and staff memos',
      path: '/notifications',
      badge: 'Broadcast',
      keywords: ['notifications', 'messages', 'sms', 'whatsapp', 'alerts', 'announcements']
    },
    {
      type: 'page',
      category: 'settings',
      id: 'set-1',
      title: 'Security & Profile Settings',
      description: 'Password, two-factor authentication, and account credentials',
      path: '/profile',
      badge: 'Account',
      keywords: ['security', 'password', 'profile', '2fa', 'settings', 'account']
    },
    {
      type: 'page',
      category: 'settings',
      id: 'set-2',
      title: 'Audit Logs & Governance History',
      description: 'Security audit trail, logins, admin actions, and timestamps',
      path: '/audit-logs',
      badge: 'Security',
      keywords: ['audit', 'logs', 'compliance', 'security trail', 'who did what']
    },
    {
      type: 'page',
      category: 'settings',
      id: 'set-3',
      title: 'Executive High-Level Dashboard',
      description: 'Board of governors overview, macro statistics, and summaries',
      path: '/executive-dashboard',
      badge: 'Executive',
      keywords: ['executive', 'board', 'proprietor', 'headmaster', 'analytics']
    }
  ];

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  search(query: string, categoryFilter: string = 'all'): Observable<SearchResult[]> {
    const q = query.trim().toLowerCase();

    let items = this.staticCatalog;
    if (categoryFilter !== 'all') {
      items = items.filter(i => i.category === categoryFilter || (categoryFilter === 'action' && i.type === 'action'));
    }

    if (!q) {
      if (categoryFilter !== 'all') {
        return of(items.slice(0, 12));
      }
      // Return top recommended shortcuts in default state
      return of(this.staticCatalog.slice(0, 10));
    }

    const localMatches = items.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      const matchType = item.type.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords && item.keywords.some(k => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchType || matchCategory || matchKeywords;
    });

    return this.http.get<SearchResult[]>(`${this.apiUrl}?q=${encodeURIComponent(query)}`).pipe(
      map(remoteResults => {
        const merged = [...localMatches];
        if (remoteResults && Array.isArray(remoteResults)) {
          for (const item of remoteResults) {
            if (!merged.some(m => m.path === item.path)) {
              merged.push({
                ...item,
                category: (item as any).category || 'registry'
              });
            }
          }
        }
        return merged;
      }),
      catchError(() => of(localMatches))
    );
  }
}

