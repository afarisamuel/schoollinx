import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { CommunicationService, Notice, MeetingSlot, MeetingBooking } from '../../../core/infrastructure/communication/communication.service';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { FiscalService } from '../../../core/infrastructure/fiscal/fiscal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Student, Guardian, AbsenceRequest, FamilyLedgerSummary, PickupPass } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

@Component({
    selector: 'app-parent-dashboard',
    standalone: true,
    imports: [CommonModule, DatePipe, RouterLink, FormsModule],
    templateUrl: './parent-dashboard.html'
})
export class ParentDashboard implements OnInit {
    private commService = inject(CommunicationService);
    private guardianService = inject(GuardianService);
    private attendanceService = inject(AttendanceService);
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private dialog = inject(DialogService);
    private toast = inject(ToastService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    profile = signal<Guardian | null>(null);
    loading = signal<boolean>(true);
    error = signal<string>('');

    // Tabs
    activeTab = signal<'overview' | 'billing' | 'pickup' | 'absence' | 'meetings' | 'notices'>('overview');

    // Multi-Ward Switcher
    selectedWardID = signal<string>('all');
    displayedStudents = computed(() => {
        const p = this.profile();
        if (!p || !p.students) return [];
        if (this.selectedWardID() === 'all') return p.students;
        return p.students.filter(s => s.id === this.selectedWardID());
    });

    // Family Ledger & Sibling Billing
    familyLedger = signal<FamilyLedgerSummary | null>(null);
    loadingLedger = signal(false);

    // Digital Pickup Pass
    pickupPass = signal<PickupPass | null>(null);
    loadingPass = signal(false);

    // Absence Requests
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

    // Notices
    notices = signal<Notice[]>([]);

    // Meetings
    selectedTeacherID = signal<string>('');
    availableSlots = signal<MeetingSlot[]>([]);
    myBookings = signal<MeetingBooking[]>([]);
    bookingReason = signal<string>('');
    bookingStudentID = signal<string>('');
    bookingSuccess = signal(false);

    // Attendance per student
    attendanceMap = signal<Record<string, AttendanceSummary>>({});

    // Prepaid Wallet per student (for daily fees)
    walletMap = signal<Record<string, number>>({});
    showTopUpModal = signal(false);
    topUpStudentID = signal('');
    topUpStudentName = signal('');
    topUpAmount = signal<number>(50);
    topUpNote = signal('Daily Canteen & Transport');
    topUpMethod = signal<'paystack' | 'direct'>('paystack');
    isSubmittingTopUp = signal(false);

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

                // Set default student for absence and booking if wards exist
                if (res.profile?.students?.length) {
                    this.absenceStudentID.set(res.profile.students[0].id || '');
                    this.bookingStudentID.set(res.profile.students[0].id || '');
                }

                // Load attendance & wallet for each student
                res.profile?.students?.forEach(s => {
                    if (s.id) {
                        this.loadAttendance(s.id);
                        this.loadWallet(s.id);
                    }
                });

                // Preload family ledger and pickup pass
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
            next: (created) => {
                this.isSubmittingAbsence.set(false);
                this.absenceSuccess.set(true);
                this.absenceNotes.set('');
                this.loadAbsenceRequests();
                setTimeout(() => this.absenceSuccess.set(false), 4000);
            },
            error: (err) => {
                this.isSubmittingAbsence.set(false);
                this.absenceError.set(err?.error?.error || 'Failed to submit absence request.');
            }
        });
    }

    setTab(tab: 'overview' | 'billing' | 'pickup' | 'absence' | 'meetings' | 'notices') {
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

    loadWallet(studentId: string) {
        this.fiscalService.getWalletInfo(studentId).pipe(
            catchError(() => of({ balance: 0, transactions: [] }))
        ).subscribe(w => {
            this.walletMap.update(map => ({ ...map, [studentId]: w?.balance || 0 }));
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
}
