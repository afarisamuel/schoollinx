import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Guardian, AbsenceRequest, FamilyLedgerSummary, PickupPass } from '../../domain/student.model';
import { Grade, GradeTrajectoryPoint } from '../../domain/grade.model';
import { FiscalRecord } from '../fiscal/fiscal.service';
import { Notice, MeetingSlot, MeetingBooking } from '../communication/communication.service';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

export interface TimetableEntry {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject?: { name: string };
    teacher?: { first_name: string; last_name: string };
    room: string;
}

export interface HomeworkItem {
    id: string;
    title: string;
    description: string;
    due_date: string;
    subject: string;
    teacher?: { first_name: string; last_name: string };
}

export interface AcademicInsight {
    id: string;
    student_id: string;
    type: 'SUBJECT' | 'CAREER' | 'RISK' | 'ENRICHMENT';
    title: string;
    description: string;
    confidence_score: number;
    reasoning: string;
}

export interface WalletInfo {
    balance: number;
    transactions: WalletTransaction[];
}

export interface WalletTransaction {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    created_at: string;
}

export interface FamilyPortalData {
    profile: Guardian;
    notices: Notice[];
    bookings: MeetingBooking[];
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ParentPortalService {
    private http = inject(HttpClient);

    // ── Profile & Overview ───────────────────────────────────────────────
    getGuardianProfile(): Observable<Guardian> {
        return this.http.get<Guardian>('/api/guardian/profile').pipe(
            catchError(() => this.http.get<Guardian>('/api/guardians/profile'))
        );
    }

    getFamilyLedger(): Observable<FamilyLedgerSummary> {
        return this.http.get<FamilyLedgerSummary>('/api/guardian/family-ledger');
    }

    getPickupPass(): Observable<PickupPass> {
        return this.http.get<PickupPass>('/api/guardian/pickup-pass');
    }

    // ── Absence Requests ─────────────────────────────────────────────────
    getAbsenceRequests(): Observable<AbsenceRequest[]> {
        return this.http.get<AbsenceRequest[]>('/api/guardian/absence-requests');
    }

    submitAbsenceRequest(req: Partial<AbsenceRequest>): Observable<AbsenceRequest> {
        return this.http.post<AbsenceRequest>('/api/guardian/absence-requests', req);
    }

    // ── Grades & Academics ───────────────────────────────────────────────
    getStudentGrades(studentId: string): Observable<Grade[]> {
        return this.http.get<Grade[]>(`/api/grades/student/${studentId}`).pipe(
            catchError(() => of([]))
        );
    }

    getGradeTrajectory(studentId: string): Observable<GradeTrajectoryPoint[]> {
        return this.http.get<GradeTrajectoryPoint[]>(`/api/grades/student/${studentId}/trajectory`).pipe(
            catchError(() => of([]))
        );
    }

    getAcademicInsights(studentId: string): Observable<AcademicInsight[]> {
        return this.http.get<AcademicInsight[]>(`/api/guardian/child/${studentId}/academics`).pipe(
            catchError(() => of([]))
        );
    }

    // ── Homework ─────────────────────────────────────────────────────────
    getHomeworkByClass(classId: string): Observable<HomeworkItem[]> {
        return this.http.get<HomeworkItem[]>(`/api/homework/class/${classId}`).pipe(
            catchError(() => of([]))
        );
    }

    // ── Timetable ────────────────────────────────────────────────────────
    getClassTimetable(classId: string): Observable<TimetableEntry[]> {
        return this.http.get<TimetableEntry[]>(`/api/timetable/class/${classId}`).pipe(
            catchError(() => of([]))
        );
    }

    // ── Wallet ───────────────────────────────────────────────────────────
    getWalletInfo(studentId: string): Observable<WalletInfo> {
        return this.http.get<WalletInfo>(`/api/fiscal/wallet/${studentId}`).pipe(
            catchError(() => of({ balance: 0, transactions: [] }))
        );
    }

    topUpWallet(studentId: string, amount: number, description: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`/api/fiscal/wallet/topup/${studentId}`, { amount, description });
    }

    // ── Fiscal Records ───────────────────────────────────────────────────
    getStudentFiscalStatus(studentId: string): Observable<{ balance: number; records: FiscalRecord[] }> {
        return this.http.get<{ balance: number; records: FiscalRecord[] }>(`/api/fiscal/students/${studentId}`).pipe(
            catchError(() => of({ balance: 0, records: [] }))
        );
    }

    getReceipt(recordId: string): Observable<Blob> {
        return this.http.get(`/api/fiscal/records/${recordId}/receipt`, { responseType: 'blob' });
    }

    // ── Attendance ───────────────────────────────────────────────────────
    getStudentAttendance(studentId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/attendance/student/${studentId}`).pipe(
            catchError(() => of([]))
        );
    }

    // ── Notices ──────────────────────────────────────────────────────────
    getNotices(): Observable<Notice[]> {
        return this.http.get<Notice[]>('/api/communication/notices?target=PARENTS').pipe(
            catchError(() => of([]))
        );
    }

    // ── Meetings ─────────────────────────────────────────────────────────
    getMeetingBookings(): Observable<MeetingBooking[]> {
        return this.http.get<MeetingBooking[]>('/api/communication/meeting-bookings/guardian/me').pipe(
            catchError(() => of([]))
        );
    }

    getMeetingSlotsByTeacher(teacherId: string): Observable<MeetingSlot[]> {
        return this.http.get<MeetingSlot[]>(`/api/communication/meeting-slots/teacher/${teacherId}`).pipe(
            catchError(() => of([]))
        );
    }

    bookMeeting(booking: Partial<MeetingBooking>): Observable<MeetingBooking> {
        return this.http.post<MeetingBooking>('/api/communication/meeting-bookings', booking);
    }

    // ── Payments ─────────────────────────────────────────────────────────
    initializePayment(recordId: string, amount: number, callbackUrl: string): Observable<{ authorization_url: string }> {
        return this.http.post<{ authorization_url: string }>('/api/payments/initialize', {
            record_id: recordId,
            amount,
            callback_url: callbackUrl
        });
    }

    initializeWalletTopUp(studentId: string, amount: number, email: string, callbackUrl: string): Observable<{ authorization_url: string }> {
        return this.http.post<{ authorization_url: string }>('/api/payments/wallet-topup', {
            student_id: studentId,
            amount,
            email,
            callback_url: callbackUrl
        });
    }

    verifyPayment(reference: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`/api/payments/verify/${reference}`, {});
    }

    // ── Milestone 3: Campus Safety, Sickbay & Logistics ────────────────────
    generatePickupOTP(studentId: string, collectorName: string, collectorPhone: string): Observable<any> {
        return this.http.post<any>('/api/guardian/pickup-pass/otp', {
            student_id: studentId,
            collector_name: collectorName,
            collector_phone: collectorPhone
        });
    }

    getSickbayVisits(studentId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/welfare/sickbay/student/${studentId}`).pipe(
            catchError(() => of([]))
        );
    }

    getLiveBusGPS(routeId: string): Observable<any> {
        return this.http.get<any>(`/api/logistics/routes/${routeId}/gps`).pipe(
            catchError(() => of(null))
        );
    }

    getAllBusRoutes(): Observable<any[]> {
        return this.http.get<any[]>('/api/logistics/routes').pipe(
            catchError(() => of([]))
        );
    }

    getStudentBusAssignment(studentId: string): Observable<any> {
        return this.http.get<any>(`/api/logistics/transport/student/${studentId}`).pipe(
            catchError(() => of(null))
        );
    }

    // ── Milestone 4: Houses, Boarding & Emergency Broadcasts ──────────────
    getHouseLeaderboard(): Observable<any[]> {
        return this.http.get<any[]>('/api/houses/leaderboard').pipe(
            catchError(() => of([
                { id: '1', name: 'Aggrey House', color: '#6366F1', crest: '🦅', total_points: 1420, rank: 1 },
                { id: '2', name: 'Guggisberg House', color: '#10B981', crest: '🦁', total_points: 1350, rank: 2 },
                { id: '3', name: 'Fraser House', color: '#F59E0B', crest: '⚡', total_points: 1210, rank: 3 },
                { id: '4', name: 'Clark House', color: '#EC4899', crest: '🛡️', total_points: 1080, rank: 4 }
            ]))
        );
    }

    getStudentHouse(studentId: string): Observable<any> {
        return this.http.get<any>(`/api/houses/student/${studentId}`).pipe(
            catchError(() => of(null))
        );
    }

    getStudentHostel(studentId: string): Observable<any> {
        return this.http.get<any>(`/api/hostels/student/${studentId}`).pipe(
            catchError(() => of(null))
        );
    }

    getEmergencyBroadcasts(): Observable<any[]> {
        return this.http.get<any[]>('/api/communication/broadcasts').pipe(
            catchError(() => of([]))
        );
    }
}
