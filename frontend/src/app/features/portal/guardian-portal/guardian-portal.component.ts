import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { Student } from '../../../core/domain/student.model';
import { AcademicInsight } from '../../../core/infrastructure/insights/insights.service';
import { FiscalService, FiscalRecord } from '../../../core/infrastructure/fiscal/fiscal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { SubjectService } from '../../../core/infrastructure/curriculum/subject.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { TimetableEntry } from '../../../core/domain/timetable.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-guardian-portal',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './guardian-portal.component.html',
    styleUrl: './guardian-portal.component.css'
})
export class GuardianPortalComponent implements OnInit {
    private guardianService = inject(GuardianService);
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private timetableService = inject(TimetableService);
    private subjectService = inject(SubjectService);
    private teacherService = inject(TeacherService);
    private dialog = inject(DialogService);

    children = signal<Student[]>([]);
    selectedChild = signal<Student | null>(null);
    insights = signal<AcademicInsight[]>([]);
    fiscalRecords = signal<FiscalRecord[]>([]);
    fiscalBalance = signal<number>(0);
    walletBalance = signal<number>(0);
    walletTransactions = signal<any[]>([]);
    walletLoading = signal(false);
    attendanceRecords = signal<any[]>([]);
    todayAttendance = signal<any | null>(null);
    attendanceStats = signal<{ present: number; absent: number; tardy: number; total: number; rate: number }>({
        present: 0,
        absent: 0,
        tardy: 0,
        total: 0,
        rate: 100
    });

    // Timetable & Live Class Highlights State
    timetableEntries = signal<TimetableEntry[]>([]);
    timetableLoading = signal(false);
    activeScheduleDay = signal<number>(new Date().getDay() >= 1 && new Date().getDay() <= 5 ? new Date().getDay() : 1);
    subjectsMap = signal<Record<string, string>>({});
    teachersMap = signal<Record<string, string>>({});

    isLoading = signal(true);
    insightsLoading = signal(false);
    fiscalLoading = signal(false);
    attendanceLoading = signal(false);

    ngOnInit() {
        this.loadMetadata();
        this.guardianService.getChildren().subscribe({
            next: (data) => {
                this.children.set(data);
                this.isLoading.set(false);
                if (data.length > 0) {
                    this.selectChild(data[0]); // Auto-select first child
                }
            },
            error: () => this.isLoading.set(false)
        });
    }

    loadMetadata() {
        this.subjectService.getSubjects().subscribe(subjs => {
            const map: Record<string, string> = {};
            for (const s of subjs) if (s.id) map[s.id] = s.name;
            this.subjectsMap.set(map);
        });
        this.teacherService.getTeachers().subscribe(teachers => {
            const map: Record<string, string> = {};
            for (const t of teachers) if (t.id) map[t.id] = `${t.first_name} ${t.last_name}`;
            this.teachersMap.set(map);
        });
    }

    selectChild(child: Student) {
        this.selectedChild.set(child);
        this.loadInsights(child.id!);
        this.loadFiscalStatus(child.id!);
        this.loadAttendance(child.id!);
        this.loadWallet(child.id!);
        if (child.class_id) {
            this.loadTimetable(child.class_id);
        } else {
            this.timetableEntries.set([]);
        }
    }

    loadTimetable(classId: string) {
        this.timetableLoading.set(true);
        this.timetableService.getClassTimetable(classId).subscribe({
            next: (entries) => {
                this.timetableEntries.set(entries);
                this.timetableLoading.set(false);
            },
            error: () => {
                this.timetableEntries.set([]);
                this.timetableLoading.set(false);
            }
        });
    }

    loadWallet(studentId: string) {
        this.walletLoading.set(true);
        this.guardianService.getStudentWallet(studentId).subscribe({
            next: (data) => {
                this.walletBalance.set(data?.balance ?? 0);
                this.walletTransactions.set(data?.transactions ?? []);
                this.walletLoading.set(false);
            },
            error: () => {
                this.walletBalance.set(0);
                this.walletTransactions.set([]);
                this.walletLoading.set(false);
            }
        });
    }

    loadAttendance(studentId: string) {
        this.attendanceLoading.set(true);
        this.guardianService.getChildAttendance(studentId).subscribe({
            next: (data) => {
                const records = data || [];
                this.attendanceRecords.set(records);

                // Check today's record
                const todayStr = new Date().toISOString().split('T')[0];
                const todayRec = records.find(r => {
                    const rDate = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
                    return rDate === todayStr;
                });
                this.todayAttendance.set(todayRec || null);

                // Calculate stats
                let present = 0, absent = 0, tardy = 0;
                records.forEach(r => {
                    const st = (r.status || '').toLowerCase();
                    if (st === 'present') present++;
                    else if (st === 'absent') absent++;
                    else if (st === 'tardy') tardy++;
                });
                const total = records.length;
                const rate = total > 0 ? Math.round((present / total) * 100) : 100;
                this.attendanceStats.set({ present, absent, tardy, total, rate });
                this.attendanceLoading.set(false);
            },
            error: () => {
                this.attendanceRecords.set([]);
                this.todayAttendance.set(null);
                this.attendanceStats.set({ present: 0, absent: 0, tardy: 0, total: 0, rate: 100 });
                this.attendanceLoading.set(false);
            }
        });
    }

    loadInsights(studentId: string) {
        this.insightsLoading.set(true);
        this.guardianService.getChildAcademics(studentId).subscribe({
            next: (data) => {
                this.insights.set(data);
                this.insightsLoading.set(false);
            },
            error: () => {
                this.insights.set([]);
                this.insightsLoading.set(false);
            }
        });
    }

    loadFiscalStatus(studentId: string) {
        this.fiscalLoading.set(true);
        this.fiscalService.getStudentFiscalStatus(studentId).subscribe({
            next: (data) => {
                this.fiscalRecords.set(data.records || []);
                this.fiscalBalance.set(data.balance || 0);
                this.fiscalLoading.set(false);
            },
            error: () => {
                this.fiscalRecords.set([]);
                this.fiscalBalance.set(0);
                this.fiscalLoading.set(false);
            }
        });
    }

    // Payment Modal
    showPaymentModal = signal(false);
    selectedRecordForPayment = signal<FiscalRecord | null>(null);
    paymentAmount = signal<number>(0);
    isPaymentLoading = signal(false);

    payOnline(record: FiscalRecord) {
        this.selectedRecordForPayment.set(record);
        this.paymentAmount.set(record.balance_due || (record.amount - (record.amount_paid || 0)));
        this.showPaymentModal.set(true);
    }

    closePaymentModal() {
        this.showPaymentModal.set(false);
        this.selectedRecordForPayment.set(null);
    }

    confirmPayment() {
        const record = this.selectedRecordForPayment();
        if (!record) return;

        const amount = this.paymentAmount();
        if (amount <= 0 || amount > (record.balance_due || (record.amount - (record.amount_paid || 0)))) {
            this.dialog.alert('Please enter a valid amount not exceeding the balance due.', 'Invalid Amount', 'warning');
            return;
        }

        this.isPaymentLoading.set(true);
        this.paymentService.initializePayment(record.id, amount).subscribe({
            next: (res) => {
                this.isPaymentLoading.set(false);
                window.location.href = res.authorization_url;
            },
            error: (err) => {
                this.isPaymentLoading.set(false);
                const errorMsg = err.error?.error || 'Failed to initialize Paystack payment checkout.';
                this.dialog.alert(errorMsg, 'Payment Initialization Failed', 'danger');
            }
        });
    }

    // Smart Wallet Top-up Modal
    showTopUpModal = signal(false);
    topUpAmount = signal<number>(50);
    isTopUpLoading = signal(false);

    openTopUpModal() {
        const child = this.selectedChild();
        if (!child) return;
        const currentBal = this.walletBalance();
        if (currentBal < 0) {
            // Suggest an amount that clears the overdraft plus GH₵50
            this.topUpAmount.set(Math.ceil((-currentBal + 50) / 10) * 10);
        } else {
            this.topUpAmount.set(50);
        }
        this.showTopUpModal.set(true);
    }

    closeTopUpModal() {
        this.showTopUpModal.set(false);
    }

    setTopUpAmount(amount: number) {
        this.topUpAmount.set(amount);
    }

    confirmTopUp() {
        const child = this.selectedChild();
        if (!child?.id) return;

        const amount = this.topUpAmount();
        if (amount <= 0) {
            this.dialog.alert('Please specify a positive top-up amount.', 'Invalid Amount', 'warning');
            return;
        }

        this.isTopUpLoading.set(true);
        this.paymentService.initializeWalletTopUp(child.id, amount).subscribe({
            next: (res) => {
                this.isTopUpLoading.set(false);
                window.location.href = res.authorization_url;
            },
            error: (err) => {
                this.isTopUpLoading.set(false);
                const errorMsg = err.error?.error || 'Failed to initialize Paystack wallet top-up.';
                this.dialog.alert(errorMsg, 'Top-Up Initialization Failed', 'danger');
            }
        });
    }

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    filteredTimetableEntries = computed(() => {
        const day = this.activeScheduleDay();
        return this.timetableEntries()
            .filter(e => e.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    getSessionStatus(entry: TimetableEntry): 'active' | 'upcoming' | 'completed' {
        const now = new Date();
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = (entry.start_time || '00:00').split(':').map(Number);
        const [eh, em] = (entry.end_time || '00:00').split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (curMinutes >= startMin && curMinutes <= endMin) return 'active';
        if (curMinutes < startMin) return 'upcoming';
        return 'completed';
    }

    selectScheduleDay(day: number) {
        this.activeScheduleDay.set(day);
    }
}

