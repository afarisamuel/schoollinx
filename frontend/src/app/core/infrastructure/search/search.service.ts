import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface SearchResult {
  type: 'student' | 'teacher' | 'class' | 'page' | 'action';
  id: string;
  title: string;
  description?: string;
  path: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = `${(environment as any).apiUrl}/search`;

  // Global state to trigger spotlight modal from anywhere (Navbar, hotkeys, etc.)
  isOpen = signal<boolean>(false);

  // Static institutional navigation catalog for instant response
  private readonly staticCatalog: SearchResult[] = [
    { type: 'page', id: 'p-1', title: 'Command Center Dashboard', description: 'Real-time overview of academics, metrics, and operations', path: '/dashboard', icon: 'fas fa-chart-line' },
    { type: 'action', id: 'a-1', title: 'Admit New Student', description: 'Register a new pupil or transfer student into a cohort', path: '/student-enrollment', icon: 'fas fa-user-plus' },
    { type: 'page', id: 'p-2', title: 'Student Directory & Roster', description: 'Search and inspect enrolled student profiles', path: '/students', icon: 'fas fa-user-graduate' },
    { type: 'page', id: 'p-3', title: 'Classes & Streams Management', description: 'Configure classrooms, streams, and capacity', path: '/classes', icon: 'fas fa-school' },
    { type: 'page', id: 'p-4', title: 'Faculty & Teacher Registry', description: 'Instructor directory and teaching assignments', path: '/teachers', icon: 'fas fa-chalkboard-teacher' },
    { type: 'page', id: 'p-5', title: 'Fee Collection & Fiscal Hub', description: 'Tuition balances, payments, and financial ledger', path: '/fiscal', icon: 'fas fa-money-bill-wave' },
    { type: 'action', id: 'a-2', title: 'Configure School Fees', description: 'Manage fee structures, bill items, and deadlines', path: '/fiscal/configure-fees', icon: 'fas fa-receipt' },
    { type: 'page', id: 'p-6', title: 'Classroom Grading & Marks', description: 'Enter scores, assessments, and generate terminal reports', path: '/teachers/grading', icon: 'fas fa-pen-nib' },
    { type: 'page', id: 'p-7', title: 'Attendance Tracker', description: 'Record daily presence, tardiness, and absence', path: '/attendance', icon: 'fas fa-calendar-check' },
    { type: 'page', id: 'p-8', title: 'Retention & At-Risk Matrix', description: 'AI insights on students requiring early academic intervention', path: '/retention-risk', icon: 'fas fa-shield-alt' },
    { type: 'page', id: 'p-9', title: 'Guardians & Parent Network', description: 'Emergency contacts and parent communications', path: '/guardians', icon: 'fas fa-users' },
    { type: 'page', id: 'p-10', title: 'Academic Terms & Periods', description: 'Configure academic years, terms, and session calendars', path: '/academic-periods', icon: 'fas fa-history' },
    { type: 'page', id: 'p-11', title: 'Timetable & Scheduling', description: 'Faculty schedules, subject rooms, and exam timetable', path: '/timetable', icon: 'fas fa-clock' },
    { type: 'page', id: 'p-12', title: 'Subscription & Campus Billing', description: 'Platform tier, renewal, and institutional billing', path: '/subscription', icon: 'fas fa-credit-card' }
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

  search(query: string): Observable<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return top recommended shortcuts
      return of(this.staticCatalog.slice(0, 6));
    }

    const localMatches = this.staticCatalog.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );

    return this.http.get<SearchResult[]>(`${this.apiUrl}?q=${encodeURIComponent(query)}`).pipe(
      map(remoteResults => {
        // Merge remote student/teacher/class results with local quick navigation links
        const merged = [...localMatches];
        if (remoteResults && Array.isArray(remoteResults)) {
          for (const item of remoteResults) {
            if (!merged.some(m => m.path === item.path)) {
              merged.push(item);
            }
          }
        }
        return merged;
      }),
      catchError(() => of(localMatches))
    );
  }
}
