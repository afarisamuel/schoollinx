import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Student } from '../../../core/domain/student.model';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { FiscalService, FiscalRecord, DailyBill } from '../../../core/infrastructure/fiscal/fiscal.service';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { Grade } from '../../../core/domain/grade.model';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { Attendance } from '../../../core/domain/attendance.model';
import { DocumentManagerComponent } from '../../../shared/components/document-manager/document-manager.component';
import { PortfolioService, StudentPortfolio, PortfolioAchievement } from '../../../core/infrastructure/portfolio/portfolio.service';
import { ClassService } from '../../../core/infrastructure/curriculum/class.service';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Guardian } from '../../../core/domain/student.model';
import { forkJoin, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { WelfareService } from '../../../core/infrastructure/welfare/welfare.service';
import { BehaviorLog } from '../../../core/domain/welfare.model';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

type Tab = 'overview' | 'timeline' | 'portfolio' | 'financials' | 'academics' | 'attendance' | 'behavior' | 'documents' | 'health';

export interface TimelineEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    metadata: any;
}

import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';

@Component({
    selector: 'app-student-detail',
    standalone: true,
    imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink, FormsModule, DocumentManagerComponent, NgxChartsModule],
    templateUrl: './student-detail.component.html',
    styleUrl: './student-detail.component.css'
})
export class StudentDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private studentService = inject(StudentService);
    private fiscalService = inject(FiscalService);
    private gradeService = inject(GradeService);
    private attendanceService = inject(AttendanceService);
    private portfolioService = inject(PortfolioService);
    private classService = inject(ClassService);
    private guardianService = inject(GuardianService);
    private welfareService = inject(WelfareService);
    private authService = inject(AuthService);
    private dialog = inject(DialogService);
    private periodService = inject(AcademicPeriodService);

    isAdmin = computed(() => this.authService.currentUserValue?.role === 'ADMIN');
    isTeacher = computed(() => this.authService.currentUserValue?.role === 'TEACHER');
    isGuardian = computed(() => this.authService.currentUserValue?.role === 'GUARDIAN');

    activeTab = signal<Tab>('overview');
    
    // Data Signals
    student = signal<Student | null>(null);
    fiscalBalance = signal<number>(0);
    fiscalRecords = signal<FiscalRecord[]>([]);
    dailyBills = signal<DailyBill[]>([]);
    grades = signal<Grade[]>([]);
    attendanceRecords = signal<Attendance[]>([]);
    timelineEvents = signal<TimelineEvent[]>([]);
    trajectoryData = signal<any[]>([]);
    portfolio = signal<StudentPortfolio | null>(null);
    classes = signal<any[]>([]);
    behaviorLogs = signal<BehaviorLog[]>([]);
    walletInfo = signal<{ balance: number; transactions: any[] } | null>(null);

    // Wallet Top-Up State
    showTopUpModal = signal(false);
    topUpAmount = signal<number>(50);
    topUpNote = signal<string>('Daily Fees & Services');
    isSubmittingTopUp = signal(false);

    // Behavior logging state
    loggingBehavior = signal(false);
    newBehaviorLog = signal<Partial<BehaviorLog>>({ type: 'DEMERIT', category: 'General', description: '' });
    
    
    // Portfolio editing state
    editingPortfolio = signal(false);
    portfolioDraft = signal<Partial<StudentPortfolio>>({});
    addingAchievement = signal(false);
    newAchievement = signal<Partial<PortfolioAchievement>>({ category: 'Award', title: '', description: '', issuer: '', date_earned: '' });

    // Loading State
    loading = signal<boolean>(true);
    error = signal<string | null>(null);

    // Computed Stats
    overallAttendancePercentage = computed(() => {
        const records = this.attendanceRecords();
        if (records.length === 0) return 100;
        const present = records.filter(r => r.status === 'Present' || r.status === 'Tardy').length;
        return Math.round((present / records.length) * 100);
    });

    averageGrade = computed(() => {
        const validGrades = this.grades().filter(g => typeof g.score === 'number');
        if (validGrades.length === 0) return null;
        const sum = validGrades.reduce((acc, curr) => acc + (curr.score as number), 0);
        return Math.round(sum / validGrades.length);
    });

    ngOnInit(): void {
        this.classService.getClasses().subscribe(c => this.classes.set(c));
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadStudentData(id);
        } else {
            this.error.set('Invalid student ID provided.');
            this.loading.set(false);
        }
    }

    getClassName(classId: string | undefined): string {
        if (!classId) return 'Unassigned';
        const cls = this.classes().find(c => c.id === classId);
        return cls ? cls.name : 'Unknown';
    }

    isPrintingBill = signal(false);

    printPupilBill(): void {
        const studentObj = this.student();
        if (!studentObj || !studentObj.id || this.isPrintingBill()) return;
        
        this.isPrintingBill.set(true);
        this.fiscalService.printPupilBill(studentObj.id).subscribe({
            next: (blob) => {
                this.isPrintingBill.set(false);
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 10000);
            },
            error: (err) => {
                this.isPrintingBill.set(false);
                this.dialog.alert('Failed to generate pupil bill. Please try again later.', 'Generation Error', 'error', 'OK');
            }
        });
    }

    isPrintingReport = signal(false);

    printTerminalReport(): void {
        const studentObj = this.student();
        if (!studentObj || !studentObj.id || this.isPrintingReport()) return;
        
        const sId = studentObj.id;
        this.isPrintingReport.set(true);
        this.periodService.getActive().subscribe({
            next: (activePeriod) => {
                const periodId = activePeriod?.id || '';
                this.periodService.getTerms(periodId).subscribe({
                    next: (terms) => {
                        const termId = terms.length > 0 ? terms[0].id : '';
                        this.executePrintTerminalReport(sId, periodId, termId);
                    },
                    error: () => this.executePrintTerminalReport(sId, periodId, '')
                });
            },
            error: () => this.executePrintTerminalReport(sId, '', '')
        });
    }

    private executePrintTerminalReport(studentId: string, periodId: string, termId: string) {
        this.studentService.printTerminalReport(studentId, periodId, termId).subscribe({
            next: (blob) => {
                this.isPrintingReport.set(false);
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 10000);
            },
            error: (err) => {
                this.isPrintingReport.set(false);
                this.dialog.alert('Failed to generate terminal report. Please try again later.', 'Generation Error', 'error', 'OK');
            }
        });
    }

    loadStudentData(id: string) {
        this.loading.set(true);
        
        // Fetch core profile first to ensure student exists
        this.studentService.getStudent(id).subscribe({
            next: (studentData) => {
                this.student.set(studentData);
                
                // Fetch supplementary data concurrently with safe fallbacks
                forkJoin({
                    fiscal: this.fiscalService.getStudentFiscalStatus(id).pipe(catchError(() => of({ balance: 0, records: [] }))),
                    dailyBills: this.fiscalService.getStudentDailyBills(id).pipe(catchError(() => of({ bills: [] }))),
                    wallet: this.fiscalService.getWalletInfo(id).pipe(catchError(() => of({ balance: 0, transactions: [] }))),
                    grades: this.gradeService.getGradesForStudent(id).pipe(catchError(() => of([]))),
                    trajectory: this.gradeService.getStudentGradeTrajectory(id).pipe(catchError(() => of([]))),
                    attendance: this.attendanceService.getStudentAttendance(id).pipe(catchError(() => of([]))),
                    timeline: this.studentService.getTimeline(id).pipe(catchError(() => of([]))),
                    portfolio: this.portfolioService.getPortfolio(id).pipe(catchError(() => of(null))),
                    behavior: this.welfareService.getStudentBehavior(id).pipe(catchError(() => of([])))
                }).subscribe({
                    next: (res) => {
                        this.fiscalBalance.set(res.fiscal?.balance || 0);
                        this.fiscalRecords.set(res.fiscal?.records || []);
                        this.dailyBills.set(res.dailyBills?.bills || []);
                        this.walletInfo.set(res.wallet);
                        this.grades.set(res.grades || []);
                        
                        // Process trajectory data for ngx-charts
                        const trajectoryMap = new Map<string, any[]>();
                        if (res.trajectory) {
                            res.trajectory.forEach((pt: any) => {
                                if (!trajectoryMap.has(pt.subject)) {
                                    trajectoryMap.set(pt.subject, []);
                                }
                                trajectoryMap.get(pt.subject)!.push({
                                    name: new Date(pt.date),
                                    value: pt.score
                                });
                            });
                            
                            const chartData = Array.from(trajectoryMap.entries()).map(([name, series]) => ({
                                name,
                                series
                            }));
                            this.trajectoryData.set(chartData);
                        }

                        this.attendanceRecords.set(res.attendance);
                        this.timelineEvents.set(res.timeline || []);
                        this.portfolio.set(res.portfolio);
                        this.behaviorLogs.set(res.behavior || []);
                        this.loading.set(false);
                    },
                    error: (err: any) => {
                        console.error('Error fetching supplementary data', err);
                        // Still show student profile even if supplementary data fails
                        this.loading.set(false);
                    }
                });
            },
            error: (err: any) => {
                console.error('Error fetching student profile', err);
                this.error.set('Failed to load student profile. They may not exist.');
                this.loading.set(false);
            }
        });
    }

    setTab(tab: Tab) {
        this.activeTab.set(tab);
    }

    startEditPortfolio() {
        const p = this.portfolio();
        this.portfolioDraft.set({ bio: p?.bio || '', ambition: p?.ambition || '', skills: p?.skills || '', languages: p?.languages || '' });
        this.editingPortfolio.set(true);
    }

    savePortfolio() {
        const id = this.student()?.id;
        if (!id) return;
        this.portfolioService.savePortfolio(id, this.portfolioDraft()).subscribe({
            next: () => {
                this.editingPortfolio.set(false);
                this.portfolioService.getPortfolio(id).subscribe(p => this.portfolio.set(p));
            }
        });
    }

    submitAchievement() {
        const id = this.student()?.id;
        if (!id) return;
        this.portfolioService.addAchievement(id, this.newAchievement()).subscribe({
            next: () => {
                this.addingAchievement.set(false);
                this.newAchievement.set({ category: 'Award', title: '', description: '', issuer: '', date_earned: '' });
                this.portfolioService.getPortfolio(id).subscribe(p => this.portfolio.set(p));
            }
        });
    }

    deleteAchievement(achievementId: string) {
        const id = this.student()?.id;
        if (!id) return;
        this.portfolioService.deleteAchievement(id, achievementId).subscribe({
            next: () => this.portfolioService.getPortfolio(id).subscribe(p => this.portfolio.set(p))
        });
    }

    resetGuardianPassword(guardian: Guardian) {
        if (!guardian.id) return;
        this.dialog.confirm(
            `Reset the portal password for ${guardian.first_name} ${guardian.last_name}? A new temporary password will be generated and emailed to them.`,
            'Reset Password',
            'warning',
            'Reset Password'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.guardianService.resetPassword(guardian.id!).subscribe({
                    next: (res) => {
                        this.dialog.alert(
                            `Password reset successfully! New temporary password: <strong>${res.password}</strong><br><br>This has been sent to ${guardian.email}. They will be required to change it on next login.`,
                            'Password Reset Complete',
                            'success'
                        );
                    },
                    error: (err) => {
                        const msg = err.error?.error || 'Failed to reset password.';
                        this.dialog.alert(msg, 'Reset Failed', 'danger');
                    }
                });
            }
        });
    }

    startLoggingBehavior() {
        this.loggingBehavior.set(true);
        this.newBehaviorLog.set({ type: 'DEMERIT', category: 'General', description: '' });
    }

    submitBehaviorLog() {
        const id = this.student()?.id;
        if (!id) return;
        
        const logToSubmit = {
            ...this.newBehaviorLog(),
            student_id: id,
            date: new Date().toISOString()
        };

        this.welfareService.logBehavior(logToSubmit).subscribe({
            next: () => {
                this.loggingBehavior.set(false);
                this.welfareService.getStudentBehavior(id).subscribe(logs => this.behaviorLogs.set(logs));
                
                // Show success message and possible SMS trigger alert
                if (logToSubmit.type === 'DEMERIT') {
                    this.dialog.alert('Disciplinary log saved. If the student has reached the threshold, an SMS alert will be automatically sent to the guardians.', 'Incident Logged', 'success');
                } else {
                    this.dialog.alert('Merit log saved successfully!', 'Incident Logged', 'success');
                }
            },
            error: (err) => {
                const msg = err.error?.error || 'Failed to log behavior.';
                this.dialog.alert(msg, 'Logging Failed', 'error');
            }
        });
    }

    deleteBehaviorLog(logId: string) {
        const id = this.student()?.id;
        if (!id || !logId) return;

        this.dialog.confirm('Are you sure you want to remove this log?', 'Delete Log', 'danger', 'Delete').subscribe(confirmed => {
            if (confirmed) {
                this.welfareService.deleteBehavior(logId).subscribe({
                    next: () => this.welfareService.getStudentBehavior(id).subscribe(logs => this.behaviorLogs.set(logs))
                });
            }
        });
    }

    openTopUpModal(amount?: number) {
        if (amount) this.topUpAmount.set(amount);
        this.showTopUpModal.set(true);
    }

    closeTopUpModal() {
        this.showTopUpModal.set(false);
    }

    submitTopUp() {
        const studentId = this.student()?.id;
        const amount = this.topUpAmount();
        const note = this.topUpNote();
        if (!studentId || amount <= 0) return;

        this.isSubmittingTopUp.set(true);
        this.fiscalService.topUpWallet(studentId, amount, note).subscribe({
            next: () => {
                this.isSubmittingTopUp.set(false);
                this.showTopUpModal.set(false);
                this.dialog.alert(`Wallet successfully topped up with GH₵${amount.toFixed(2)}! Daily fee deductions will automatically draw from this balance.`, 'Top-Up Successful', 'success');
                // Refresh wallet info, balance, and daily bills
                this.fiscalService.getWalletInfo(studentId).subscribe(w => this.walletInfo.set(w));
                this.studentService.getStudent(studentId).subscribe(s => this.student.set(s));
                this.fiscalService.getStudentDailyBills(studentId).subscribe(res => this.dailyBills.set(res.bills || []));
            },
            error: (err) => {
                this.isSubmittingTopUp.set(false);
                this.dialog.alert(err.error?.error || 'Failed to top up wallet', 'Top-Up Error', 'error');
            }
        });
    }
}
