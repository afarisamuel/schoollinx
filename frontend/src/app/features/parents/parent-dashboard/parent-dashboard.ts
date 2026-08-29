import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { CommunicationService, Notice, MeetingSlot, MeetingBooking } from '../../../core/infrastructure/communication/communication.service';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { FiscalService, FiscalRecord } from '../../../core/infrastructure/fiscal/fiscal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Student, Guardian, AbsenceRequest, FamilyLedgerSummary, PickupPass } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Grade, GradeTrajectoryPoint } from '../../../core/domain/grade.model';
import { HttpClient } from '@angular/common/http';

export type DashboardTab = 'overview' | 'academics' | 'billing' | 'schedule' | 'pickup' | 'absence' | 'meetings' | 'notices' | 'health' | 'activities' | 'settings';

interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

interface TimetableEntry {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject?: { name: string };
    teacher?: { first_name: string; last_name: string };
    room: string;
}

interface HomeworkItem {
    id: string;
    title: string;
    description: string;
    due_date: string;
    subject: string;
    teacher?: { first_name: string; last_name: string };
}

interface AcademicInsight {
    id?: string;
    student_id?: string;
    type?: string;
    title?: string;
    description?: string;
    confidence_score?: number;
    reasoning?: string;
    subject?: string;
    average?: number;
    trend?: string;
    remarks?: string;
}

interface WalletTransaction {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    created_at: string;
}

@Component({
    selector: 'app-parent-dashboard',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule],
    templateUrl: './parent-dashboard.html'
})
export class ParentDashboard implements OnInit {
    private commService = inject(CommunicationService);
    private guardianService = inject(GuardianService);
    private attendanceService = inject(AttendanceService);
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private gradeService = inject(GradeService);
    private dialog = inject(DialogService);
    private toast = inject(ToastService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);

    profile = signal<Guardian | null>(null);
    loading = signal<boolean>(true);
    error = signal<string>('');

    // ── TABS ───────────────────────────────────────────────────────────────
    activeTab = signal<DashboardTab>('overview');

    // Multi-Ward Switcher
    selectedWardID = signal<string>('all');
    displayedStudents = computed(() => {
        const p = this.profile();
        if (!p || !p.students) return [];
        if (this.selectedWardID() === 'all') return p.students;
        return p.students.filter(s => s.id === this.selectedWardID());
    });

    // ── FAMILY LEDGER ──────────────────────────────────────────────────────
    familyLedger = signal<FamilyLedgerSummary | null>(null);
    loadingLedger = signal(false);

    // ── DIGITAL PICKUP PASS ────────────────────────────────────────────────
    pickupPass = signal<PickupPass | null>(null);
    loadingPass = signal(false);

    // ── ABSENCE REQUESTS ───────────────────────────────────────────────────
    absenceRequests = signal<AbsenceRequest[]>([]);
    loadingAbsences = signal(false);
    absenceStudentID = signal<string>('');
    absenceStartDate = signal<string>('');
    absenceEndDate = signal<string>('');
    absenceReason = signal<string>('Medical');
    absenceNotes = signal<string>('');
    isSubmittingAbsence = signal(false);
    absenceSuccess = signal(false);
    absenceError = signal('');

    // ── NOTICES ────────────────────────────────────────────────────────────
    notices = signal<Notice[]>([]);
    noticeFilter = signal<string>('ALL');

    filteredNotices = computed(() => {
        const filter = this.noticeFilter();
        if (filter === 'ALL') return this.notices();
        return this.notices().filter(n => n.target === filter || n.target === 'ALL');
    });

    // ── MEETINGS ───────────────────────────────────────────────────────────
    selectedTeacherID = signal<string>('');
    availableSlots = signal<MeetingSlot[]>([]);
    myBookings = signal<MeetingBooking[]>([]);
    bookingReason = signal<string>('');
    bookingStudentID = signal<string>('');
    bookingSuccess = signal(false);

    // ── ATTENDANCE ─────────────────────────────────────────────────────────
    attendanceMap = signal<Record<string, AttendanceSummary>>({});

    // ── WALLET & TOP-UP ────────────────────────────────────────────────────
    walletMap = signal<Record<string, number>>({});
    walletTransactionsMap = signal<Record<string, WalletTransaction[]>>({});
    showTopUpModal = signal(false);
    topUpStudentID = signal('');
    topUpStudentName = signal('');
    topUpAmount = signal<number>(50);
    topUpNote = signal('Daily Canteen & Transport');
    topUpMethod = signal<'paystack' | 'direct'>('paystack');
    isSubmittingTopUp = signal(false);

    // ── ACADEMICS ──────────────────────────────────────────────────────────
    gradesMap = signal<Record<string, Grade[]>>({});
    trajectoryMap = signal<Record<string, GradeTrajectoryPoint[]>>({});
    homeworkMap = signal<Record<string, HomeworkItem[]>>({});
    timetableMap = signal<Record<string, TimetableEntry[]>>({});
    insightsMap = signal<Record<string, AcademicInsight[]>>({});
    fiscalMap = signal<Record<string, FiscalRecord[]>>({});
    loadingAcademics = signal(false);

    // GPA computed per student
    gpaMap = computed(() => {
        const result: Record<string, number> = {};
        const grades = this.gradesMap();
        for (const [sid, gradeList] of Object.entries(grades)) {
            if (gradeList.length === 0) { result[sid] = 0; continue; }
            const avg = gradeList.reduce((s, g) => s + (g.score || 0), 0) / gradeList.length;
            result[sid] = Math.round(avg * 10) / 10;
        }
        return result;
    });

    averageAttendance = computed(() => {
        const students = this.profile()?.students || [];
        if (!students.length) return 0;
        const att = this.attendanceMap();
        const total = students.reduce((sum, s) => sum + (att[s.id || '']?.percentage || 0), 0);
        return Math.round(total / students.length);
    });

    // Homework pending count per student
    pendingHomeworkMap = computed(() => {
        const result: Record<string, number> = {};
        const hw = this.homeworkMap();
        const today = new Date().toISOString().slice(0, 10);
        for (const [sid, items] of Object.entries(hw)) {
            result[sid] = items.filter(h => h.due_date >= today).length;
        }
        return result;
    });

    // Today's schedule per student
    todaysTimetableMap = computed(() => {
        const result: Record<string, TimetableEntry[]> = {};
        const tt = this.timetableMap();
        const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
        for (const [sid, entries] of Object.entries(tt)) {
            result[sid] = entries.filter(e => e.day_of_week === dayOfWeek);
        }
        return result;
    });

    // Total alerts for smart banner
    smartAlerts = computed(() => {
        const alerts: Array<{ type: 'warning' | 'info' | 'danger'; message: string }> = [];
        const ledger = this.familyLedger();
        if (ledger && ledger.total_family_balance > 0) {
            alerts.push({ type: 'danger', message: `Outstanding family balance: GH₵${ledger.total_family_balance.toFixed(2)}` });
        }
        const absences = this.absenceRequests();
        const pending = absences.filter(a => a.status === 'PENDING').length;
        if (pending > 0) {
            alerts.push({ type: 'info', message: `${pending} absence request(s) pending school review` });
        }
        const notices = this.notices();
        if (notices.length > 0) {
            alerts.push({ type: 'info', message: `${notices.length} school notice(s) available` });
        }
        return alerts;
    });

    // Days of week labels
    readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    readonly quickAmounts = [20, 50, 100, 200, 500];

    ngOnInit() {
        this.loadAll();
        this.checkPaymentReturn();
    }

    private checkPaymentReturn() {
        this.route.queryParams.subscribe(params => {
            const ref = params['reference'] || params['trxref'];
            if (ref) {
                this.toast.info('Verifying payment status...', 'Payment Verification');
                this.paymentService.verifyPayment(ref).subscribe({
                    next: () => {
                        this.toast.success('Payment verified successfully! Your balance has been updated.', 'Payment Successful');
                        this.activeTab.set('billing');
                        this.loadFamilyLedger();
                        this.profile()?.students?.forEach(s => {
                            if (s.id) this.loadWallet(s.id);
                        });
                        this.router.navigate([], { queryParams: { tab: 'billing' }, replaceUrl: true });
                    },
                    error: () => {
                        this.router.navigate([], { queryParams: { tab: 'billing' }, replaceUrl: true });
                    }
                });
            }
        });
    }

    loadAll() {
        this.loading.set(true);
        forkJoin({
            profile: this.guardianService.getProfile(),
            notices: this.commService.getNotices('PARENTS').pipe(catchError(() => of([]))),
            bookings: this.commService.getBookingsByGuardian('me').pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                this.profile.set(res.profile);
                this.notices.set(res.notices);
                this.myBookings.set(res.bookings as MeetingBooking[]);
                this.loading.set(false);

                if (res.profile?.students?.length) {
                    this.absenceStudentID.set(res.profile.students[0].id || '');
                    this.bookingStudentID.set(res.profile.students[0].id || '');
                }

                res.profile?.students?.forEach(s => {
                    if (s.id) {
                        this.loadAttendance(s.id);
                        this.loadWallet(s.id);
                        this.loadGrades(s.id);
                        this.loadFiscalStatus(s.id);
                        if (s.class_id) {
                            this.loadHomework(s.id, s.class_id);
                            this.loadTimetable(s.id, s.class_id);
                        }
                        this.loadInsights(s.id);
                    }
                });

                this.loadFamilyLedger();
                this.loadPickupPass();
                this.loadAbsenceRequests();
            },
            error: () => {
                this.error.set('Could not load your profile. Please try again.');
                this.loading.set(false);
            }
        });
    }

    selectWard(wardId: string) {
        this.selectedWardID.set(wardId);
        if (wardId !== 'all') {
            this.absenceStudentID.set(wardId);
            this.bookingStudentID.set(wardId);
        }
    }

    loadAttendance(studentId: string) {
        this.attendanceService.getStudentAttendance(studentId).pipe(
            catchError(() => of([]))
        ).subscribe(records => {
            const total = records.length;
            const present = records.filter(r => (r.status as string).toUpperCase() === 'PRESENT').length;
            const absent = records.filter(r => (r.status as string).toUpperCase() === 'ABSENT').length;
            const late = records.filter(r => {
                const s = (r.status as string).toUpperCase();
                return s === 'LATE' || s === 'TARDY';
            }).length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;

            this.attendanceMap.update(m => ({
                ...m,
                [studentId]: { total, present, absent, late, percentage: pct }
            }));
        });
    }

    loadGrades(studentId: string) {
        this.gradeService.getGradesForStudent(studentId).pipe(
            catchError(() => of([]))
        ).subscribe(grades => {
            this.gradesMap.update(m => ({ ...m, [studentId]: grades }));
        });

        this.gradeService.getStudentGradeTrajectory(studentId).pipe(
            catchError(() => of([]))
        ).subscribe(traj => {
            this.trajectoryMap.update(m => ({ ...m, [studentId]: traj }));
        });
    }

    loadHomework(studentId: string, classId: string) {
        this.http.get<HomeworkItem[]>(`/api/homework/class/${classId}`).pipe(
            catchError(() => of([]))
        ).subscribe(hw => {
            this.homeworkMap.update(m => ({ ...m, [studentId]: hw }));
        });
    }

    loadTimetable(studentId: string, classId: string) {
        this.http.get<TimetableEntry[]>(`/api/timetable/class/${classId}`).pipe(
            catchError(() => of([]))
        ).subscribe(tt => {
            this.timetableMap.update(m => ({ ...m, [studentId]: tt }));
        });
    }

    loadInsights(studentId: string) {
        this.guardianService.getChildAcademics(studentId).pipe(
            catchError(() => of([]))
        ).subscribe((insights: any) => {
            this.insightsMap.update(m => ({ ...m, [studentId]: insights as AcademicInsight[] }));
        });
    }

    loadFiscalStatus(studentId: string) {
        this.fiscalService.getStudentFiscalStatus(studentId).pipe(
            catchError(() => of({ balance: 0, records: [] }))
        ).subscribe(res => {
            this.fiscalMap.update(m => ({ ...m, [studentId]: res.records || [] }));
        });
    }

    loadFamilyLedger() {
        this.loadingLedger.set(true);
        this.guardianService.getMyFamilyLedger().pipe(
            catchError(() => of(null))
        ).subscribe(ledger => {
            this.familyLedger.set(ledger);
            this.loadingLedger.set(false);
        });
    }

    loadPickupPass() {
        this.loadingPass.set(true);
        this.guardianService.getMyPickupPass().pipe(
            catchError(() => of(null))
        ).subscribe(pass => {
            this.pickupPass.set(pass);
            this.loadingPass.set(false);
        });
    }

    loadAbsenceRequests() {
        this.loadingAbsences.set(true);
        this.guardianService.getMyAbsenceRequests().pipe(
            catchError(() => of([]))
        ).subscribe(reqs => {
            this.absenceRequests.set(reqs);
            this.loadingAbsences.set(false);
        });
    }

    submitAbsence() {
        if (!this.absenceStudentID() || !this.absenceStartDate() || !this.absenceEndDate() || !this.absenceReason()) {
            this.absenceError.set('Please fill out all required fields.');
            return;
        }

        this.isSubmittingAbsence.set(true);
        this.absenceError.set('');

        this.guardianService.submitAbsenceRequest({
            student_id: this.absenceStudentID(),
            start_date: this.absenceStartDate(),
            end_date: this.absenceEndDate(),
            reason: this.absenceReason(),
            notes: this.absenceNotes()
        }).subscribe({
            next: () => {
                this.isSubmittingAbsence.set(false);
                this.absenceSuccess.set(true);
                this.absenceNotes.set('');
                this.absenceStartDate.set('');
                this.absenceEndDate.set('');
                this.loadAbsenceRequests();
                setTimeout(() => this.absenceSuccess.set(false), 4000);
            },
            error: (err) => {
                this.isSubmittingAbsence.set(false);
                this.absenceError.set(err?.error?.error || 'Failed to submit absence request.');
            }
        });
    }

    setTab(tab: DashboardTab) {
        this.activeTab.set(tab);
    }

    loadSlots() {
        const tid = this.selectedTeacherID();
        if (!tid) return;
        this.commService.getMeetingSlotsByTeacher(tid).subscribe(slots => {
            this.availableSlots.set(slots.filter(s => !s.is_booked));
        });
    }

    bookSlot(slotId: string) {
        const p = this.profile();
        const booking: Partial<MeetingBooking> = {
            meeting_slot_id: slotId,
            guardian_id: p?.id || '',
            student_id: this.bookingStudentID(),
            reason: this.bookingReason()
        };
        this.commService.bookMeeting(booking).subscribe({
            next: () => {
                this.bookingSuccess.set(true);
                this.loadSlots();
                this.myBookings.update(b => [...b]);
                setTimeout(() => this.bookingSuccess.set(false), 4000);
            }
        });
    }

    getAttendance(studentId: string): AttendanceSummary {
        return this.attendanceMap()[studentId] || { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };
    }

    getGrades(studentId: string): Grade[] {
        return this.gradesMap()[studentId] || [];
    }

    getGradesBySubject(studentId: string): Record<string, Grade[]> {
        const grades = this.getGrades(studentId);
        return grades.reduce((acc, g) => {
            const subj = g.subject || 'Unknown';
            if (!acc[subj]) acc[subj] = [];
            acc[subj].push(g);
            return acc;
        }, {} as Record<string, Grade[]>);
    }

    getSubjectAverage(grades: Grade[]): number {
        if (!grades.length) return 0;
        return Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length * 10) / 10;
    }

    getSubjectColor(avg: number): string {
        if (avg >= 80) return 'text-emerald-400';
        if (avg >= 65) return 'text-amber-400';
        if (avg >= 50) return 'text-orange-400';
        return 'text-rose-400';
    }

    getGradeLetterColor(score: number): string {
        if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (score >= 65) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (score >= 50) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }

    getGradeLetter(score: number): string {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    getHomework(studentId: string): HomeworkItem[] {
        return this.homeworkMap()[studentId] || [];
    }

    getPendingHomework(studentId: string): HomeworkItem[] {
        const today = new Date().toISOString().slice(0, 10);
        return this.getHomework(studentId).filter(h => h.due_date >= today);
    }

    getOverdueHomework(studentId: string): HomeworkItem[] {
        const today = new Date().toISOString().slice(0, 10);
        return this.getHomework(studentId).filter(h => h.due_date < today);
    }

    getTimetable(studentId: string): TimetableEntry[] {
        return this.timetableMap()[studentId] || [];
    }

    getTodaySchedule(studentId: string): TimetableEntry[] {
        return this.todaysTimetableMap()[studentId] || [];
    }

    getTimetableByDay(studentId: string, day: number): TimetableEntry[] {
        return this.getTimetable(studentId).filter(e => e.day_of_week === day);
    }

    getInsights(studentId: string): AcademicInsight[] {
        return this.insightsMap()[studentId] || [];
    }

    getFiscalRecords(studentId: string): FiscalRecord[] {
        return this.fiscalMap()[studentId] || [];
    }

    getAttendanceStreak(studentId: string): number {
        // Rough streak: based on percentage > 90
        const att = this.getAttendance(studentId);
        if (att.percentage >= 95) return 30;
        if (att.percentage >= 90) return 20;
        if (att.percentage >= 80) return 10;
        return 0;
    }

    getAchievements(studentId: string): Array<{ icon: string; label: string; color: string }> {
        const achievements = [];
        const att = this.getAttendance(studentId);
        const gpa = this.gpaMap()[studentId] || 0;
        const hw = this.getHomework(studentId);

        if (att.percentage >= 95) achievements.push({ icon: '🏆', label: 'Perfect Attendance', color: 'amber' });
        if (att.percentage >= 80) achievements.push({ icon: '⭐', label: 'Good Attendance', color: 'yellow' });
        if (gpa >= 80) achievements.push({ icon: '🎓', label: 'Academic Excellence', color: 'indigo' });
        if (gpa >= 70) achievements.push({ icon: '📚', label: 'Strong Performer', color: 'blue' });
        if (hw.length > 0) achievements.push({ icon: '✅', label: 'Active Learner', color: 'emerald' });
        if (att.absent === 0) achievements.push({ icon: '🌟', label: 'Zero Absences', color: 'purple' });

        return achievements;
    }

    payWard(studentId: string, studentName: string) {
        this.fiscalService.getStudentFiscalStatus(studentId).subscribe({
            next: (res) => {
                const pending = res.records?.find(r => r.status !== 'PAID' && ((r.balance_due || 0) > 0 || (r.amount - (r.amount_paid || 0)) > 0));
                if (!pending) {
                    this.dialog.alert(`No pending fee invoices found for ${studentName}.`, 'Fees Settled', 'info');
                    return;
                }
                const amt = pending.balance_due || (pending.amount - (pending.amount_paid || 0));
                this.dialog.confirm(
                    `Proceed to pay GH₵ ${amt.toFixed(2)} for ${studentName} via Paystack?`,
                    'Online Fee Payment',
                    'info',
                    'Pay Now'
                ).subscribe(confirmed => {
                    if (confirmed) {
                        const callbackUrl = `${window.location.origin}/parents?tab=billing`;
                        this.paymentService.initializePayment(pending.id, amt, callbackUrl).subscribe({
                            next: (payRes) => {
                                window.location.href = payRes.authorization_url;
                            },
                            error: (err) => {
                                this.dialog.alert(err.error?.error || 'Failed to initialize Paystack checkout.', 'Payment Error', 'error');
                            }
                        });
                    }
                });
            },
            error: () => {
                this.dialog.alert('Failed to retrieve fee records for this student.', 'Error', 'error');
            }
        });
    }

    payFamilyBalance() {
        const wards = this.familyLedger()?.wards?.filter(w => w.balance_due > 0) || [];
        if (wards.length === 0) {
            this.dialog.alert('All family fees are fully settled! No outstanding balance.', 'Fees Settled', 'success');
            return;
        }

        const firstWard = wards[0];
        this.payWard(firstWard.student_id, firstWard.student_name);
    }

    downloadReceipt(studentId: string) {
        const records = this.getFiscalRecords(studentId).filter(r => r.status === 'PAID');
        if (!records.length) {
            this.toast.info('No paid records found for receipt download.', 'No Records');
            return;
        }
        this.fiscalService.getReceipt(records[0].id).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt_${studentId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.toast.error('Could not download receipt at this time.', 'Download Failed');
            }
        });
    }

    loadWallet(studentId: string) {
        this.fiscalService.getWalletInfo(studentId).pipe(
            catchError(() => of({ balance: 0, transactions: [] }))
        ).subscribe(w => {
            this.walletMap.update(map => ({ ...map, [studentId]: w?.balance || 0 }));
            this.walletTransactionsMap.update(map => ({ ...map, [studentId]: w?.transactions || [] }));
        });
    }

    openTopUp(student: any, amount: number = 50) {
        const id = student.id || student.student_id;
        if (!id) return;
        this.topUpStudentID.set(id);
        const name = student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
        this.topUpStudentName.set(name);
        this.topUpAmount.set(amount);
        this.showTopUpModal.set(true);
    }

    closeTopUp() {
        this.showTopUpModal.set(false);
    }

    submitTopUp() {
        const studentId = this.topUpStudentID();
        const amount = this.topUpAmount();
        const note = this.topUpNote();
        if (!studentId || amount <= 0) return;

        this.isSubmittingTopUp.set(true);

        if (this.topUpMethod() === 'paystack') {
            const payerEmail = this.profile()?.email || '';
            const callbackUrl = `${window.location.origin}/parents?tab=billing`;
            this.toast.info('Connecting to Paystack checkout...', 'Paystack Checkout');
            this.paymentService.initializeWalletTopUp(studentId, amount, payerEmail, callbackUrl).subscribe({
                next: (payRes) => {
                    this.isSubmittingTopUp.set(false);
                    this.showTopUpModal.set(false);
                    window.location.href = payRes.authorization_url;
                },
                error: () => {
                    this.isSubmittingTopUp.set(false);
                }
            });
            return;
        }

        this.fiscalService.topUpWallet(studentId, amount, note).subscribe({
            next: () => {
                this.isSubmittingTopUp.set(false);
                this.showTopUpModal.set(false);
                this.toast.success(
                    `Wallet for ${this.topUpStudentName()} credited with GH₵${amount.toFixed(2)}`,
                    'Top-Up Successful'
                );
                this.loadWallet(studentId);
                this.loadFamilyLedger();
            },
            error: (err) => {
                this.isSubmittingTopUp.set(false);
                const msg = err.error?.error || 'Failed to complete top up';
                this.toast.error(msg, 'Top-Up Failed');
            }
        });
    }

    sharePickupPass() {
        const p = this.profile();
        if (!p) return;
        if (navigator.share) {
            navigator.share({
                title: 'School Pickup Pass',
                text: `${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(`${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code || 'N/A'}`);
            this.toast.success('Pickup pass details copied to clipboard!', 'Copied');
        }
    }

    printPass() {
        window.print();
    }

    getApprovedAbsenceDays(): number {
        return this.absenceRequests()
            .filter(a => a.status === 'APPROVED')
            .reduce((total, a) => {
                if (!a.start_date || !a.end_date) return total;
                const diff = (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1;
                return total + Math.max(1, diff);
            }, 0);
    }

    getPendingAbsenceDays(): number {
        return this.absenceRequests()
            .filter(a => a.status === 'PENDING')
            .reduce((total, a) => {
                if (!a.start_date || !a.end_date) return total;
                const diff = (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1;
                return total + Math.max(1, diff);
            }, 0);
    }

    getAbsenceStatusClass(status: string): string {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        }
    }

    getTotalFamilyWallet(): number {
        let total = 0;
        for (const v of Object.values(this.walletMap())) {
            total += v;
        }
        return total;
    }

    getUpcomingHomework(studentId: string): HomeworkItem[] {
        const today = new Date().toISOString().slice(0, 10);
        const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return this.getHomework(studentId).filter(h => h.due_date >= today && h.due_date <= threeDays);
    }

    isHomeworkDueSoon(dueDate: string): boolean {
        const today = new Date().toISOString().slice(0, 10);
        const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return dueDate >= today && dueDate <= threeDays;
    }

    isHomeworkOverdue(dueDate: string): boolean {
        const today = new Date().toISOString().slice(0, 10);
        return dueDate < today;
    }

    getDayLabel(dayNum: number): string {
        return this.dayLabels[dayNum] || 'Unknown';
    }

    getTodayDayOfWeek(): number {
        return new Date().getDay();
    }

    getSubjectInitial(subject: string): string {
        return subject ? subject.charAt(0).toUpperCase() : '?';
    }

    getHomeworkCompletionRate(studentId: string): number {
        const hw = this.getHomework(studentId);
        if (!hw.length) return 0;
        const today = new Date().toISOString().slice(0, 10);
        const past = hw.filter(h => h.due_date < today);
        if (!past.length) return 100;
        // Can't check submission status from parent view, so show all past as "completed" unless known
        return Math.round((past.length / hw.length) * 100);
    }

    getWalletTransactions(studentId: string): WalletTransaction[] {
        return this.walletTransactionsMap()[studentId] || [];
    }

    // For the settings tab
    profileEditMode = signal(false);
    editFirstName = signal('');
    editLastName = signal('');
    editPhone = signal('');
    editAddress = signal('');

    enterEditMode() {
        const p = this.profile();
        if (!p) return;
        this.editFirstName.set(String(p.first_name || ''));
        this.editLastName.set(String(p.last_name || ''));
        this.editPhone.set(String(p.phone_number || ''));
        this.editAddress.set(String(p.address || ''));
        this.profileEditMode.set(true);
    }

    cancelEditMode() {
        this.profileEditMode.set(false);
    }

    saveProfile() {
        this.toast.info('Profile update feature coming soon!', 'Feature Preview');
        this.profileEditMode.set(false);
    }

    // Dark mode toggle
    isDarkMode = signal(document.documentElement.classList.contains('dark'));
    toggleDarkMode() {
        const isDark = !this.isDarkMode();
        this.isDarkMode.set(isDark);
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Print portal summary
    printSummary() {
        window.print();
    }

    objectKeys(obj: any): string[] {
        return Object.keys(obj || {});
    }

    formatCurrency(amount: number): string {
        return `GH₵${(amount || 0).toFixed(2)}`;
    }

    trackById(index: number, item: any): any {
        return item.id || index;
    }

    trackByIndex(index: number): number {
        return index;
    }
}
