import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, catchError, of } from 'rxjs';
import { Guardian, AbsenceRequest, FamilyLedgerSummary } from '../../domain/student.model';
import { Grade, GradeTrajectoryPoint } from '../../domain/grade.model';
import { FiscalRecord } from '../fiscal/fiscal.service';
import { Notice, MeetingBooking } from '../communication/communication.service';
import {
    ParentPortalService,
    AttendanceSummary,
    TimetableEntry,
    HomeworkItem,
    AcademicInsight,
    WalletInfo,
} from './parent-portal.service';

/**
 * Shared state store for the parent portal.
 * Keeps loaded data in signals so all child pages share it without re-fetching.
 */
@Injectable({ providedIn: 'root' })
export class ParentStateService {
    private api = inject(ParentPortalService);

    // ── Core State ───────────────────────────────────────────────────────
    profile = signal<Guardian | null>(null);
    loading = signal(true);
    error = signal('');

    // ── Family Finance ───────────────────────────────────────────────────
    familyLedger = signal<FamilyLedgerSummary | null>(null);
    walletMap = signal<Record<string, WalletInfo>>({});
    fiscalMap = signal<Record<string, FiscalRecord[]>>({});

    // ── Academics ────────────────────────────────────────────────────────
    gradesMap = signal<Record<string, Grade[]>>({});
    trajectoryMap = signal<Record<string, GradeTrajectoryPoint[]>>({});
    homeworkMap = signal<Record<string, HomeworkItem[]>>({});
    timetableMap = signal<Record<string, TimetableEntry[]>>({});
    insightsMap = signal<Record<string, AcademicInsight[]>>({});
    attendanceMap = signal<Record<string, AttendanceSummary>>({});

    // ── Communication ────────────────────────────────────────────────────
    notices = signal<Notice[]>([]);
    bookings = signal<MeetingBooking[]>([]);

    // ── Absence ──────────────────────────────────────────────────────────
    absenceRequests = signal<AbsenceRequest[]>([]);

    // ── Computed ─────────────────────────────────────────────────────────
    gpaMap = computed(() => {
        const result: Record<string, number> = {};
        for (const [sid, grades] of Object.entries(this.gradesMap())) {
            if (!grades.length) { result[sid] = 0; continue; }
            result[sid] = Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length * 10) / 10;
        }
        return result;
    });

    smartAlerts = computed(() => {
        const alerts: Array<{ type: 'danger' | 'warning' | 'info'; message: string }> = [];
        const ledger = this.familyLedger();
        if (ledger && ledger.total_family_balance > 0) {
            alerts.push({ type: 'danger', message: `Outstanding family balance: GH₵${ledger.total_family_balance.toFixed(2)}` });
        }
        const pending = this.absenceRequests().filter(a => a.status === 'PENDING').length;
        if (pending > 0) {
            alerts.push({ type: 'info', message: `${pending} absence request(s) pending school review` });
        }
        if (this.notices().length > 0) {
            alerts.push({ type: 'info', message: `${this.notices().length} school notice(s) available` });
        }
        return alerts;
    });

    totalWalletBalance = computed(() => {
        return Object.values(this.walletMap()).reduce((sum, w) => sum + (w.balance || 0), 0);
    });

    // ── Bootstrap ────────────────────────────────────────────────────────
    initialized = false;

    bootstrap() {
        if (this.initialized) return;
        this.initialized = true;
        this.loading.set(true);

        forkJoin({
            profile: this.api.getGuardianProfile(),
            notices: this.api.getNotices(),
            bookings: this.api.getMeetingBookings(),
            absences: this.api.getAbsenceRequests().pipe(catchError(() => of([]))),
            ledger: this.api.getFamilyLedger().pipe(catchError(() => of(null)))
        }).subscribe({
            next: (res) => {
                this.profile.set(res.profile);
                this.notices.set(res.notices);
                this.bookings.set(res.bookings as MeetingBooking[]);
                this.absenceRequests.set(res.absences);
                this.familyLedger.set(res.ledger);
                this.loading.set(false);

                // Per-student lazy loads
                res.profile?.students?.forEach(s => {
                    if (s.id) {
                        this.loadStudentData(s.id, s.class_id || '');
                    }
                });
            },
            error: () => {
                this.error.set('Could not load your profile. Please try again.');
                this.loading.set(false);
            }
        });
    }

    refresh() {
        this.initialized = false;
        this.bootstrap();
    }

    loadStudentData(studentId: string, classId: string) {
        // Attendance
        this.api.getStudentAttendance(studentId).subscribe(records => {
            const total = records.length;
            const present = records.filter((r: any) => (r.status as string).toUpperCase() === 'PRESENT').length;
            const absent = records.filter((r: any) => (r.status as string).toUpperCase() === 'ABSENT').length;
            const late = records.filter((r: any) => {
                const s = (r.status as string).toUpperCase();
                return s === 'LATE' || s === 'TARDY';
            }).length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            this.attendanceMap.update(m => ({ ...m, [studentId]: { total, present, absent, late, percentage } }));
        });

        // Grades
        this.api.getStudentGrades(studentId).subscribe(g => {
            this.gradesMap.update(m => ({ ...m, [studentId]: g }));
        });

        this.api.getGradeTrajectory(studentId).subscribe(t => {
            this.trajectoryMap.update(m => ({ ...m, [studentId]: t }));
        });

        // Wallet & Fiscal
        this.api.getWalletInfo(studentId).subscribe(w => {
            this.walletMap.update(m => ({ ...m, [studentId]: w }));
        });

        this.api.getStudentFiscalStatus(studentId).subscribe(res => {
            this.fiscalMap.update(m => ({ ...m, [studentId]: res.records || [] }));
        });

        // Insights
        this.api.getAcademicInsights(studentId).subscribe(ins => {
            this.insightsMap.update(m => ({ ...m, [studentId]: ins }));
        });

        // Class-level data
        if (classId) {
            this.api.getHomeworkByClass(classId).subscribe(hw => {
                this.homeworkMap.update(m => ({ ...m, [studentId]: hw }));
            });
            this.api.getClassTimetable(classId).subscribe(tt => {
                this.timetableMap.update(m => ({ ...m, [studentId]: tt }));
            });
        }
    }

    reloadAbsences() {
        this.api.getAbsenceRequests().pipe(catchError(() => of([]))).subscribe(a => {
            this.absenceRequests.set(a);
        });
    }

    reloadLedger() {
        this.api.getFamilyLedger().pipe(catchError(() => of(null))).subscribe(l => {
            this.familyLedger.set(l);
        });
    }

    reloadWallet(studentId: string) {
        this.api.getWalletInfo(studentId).subscribe(w => {
            this.walletMap.update(m => ({ ...m, [studentId]: w }));
        });
    }

    reloadBookings() {
        this.api.getMeetingBookings().pipe(catchError(() => of([]))).subscribe(b => {
            this.bookings.set(b as MeetingBooking[]);
        });
    }
}
