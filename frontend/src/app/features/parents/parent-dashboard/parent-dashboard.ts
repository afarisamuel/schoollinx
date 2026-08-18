import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { CommunicationService, Notice, MeetingSlot, MeetingBooking } from '../../../core/infrastructure/communication/communication.service';

interface Student {
    id: string;
    first_name: string;
    last_name: string;
    enrollment_num: string;
    status: string;
    level: number;
    class_name?: string;
}

interface GuardianProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    relationship: string;
    students: Student[];
}

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
    private http = inject(HttpClient);
    private commService = inject(CommunicationService);

    profile = signal<GuardianProfile | null>(null);
    loading = signal<boolean>(true);
    error = signal<string>('');

    activeTab = signal<'overview' | 'notices' | 'meetings'>('overview');

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

    ngOnInit() {
        this.loadAll();
    }

    loadAll() {
        this.loading.set(true);
        forkJoin({
            profile: this.http.get<GuardianProfile>('/api/guardians/profile'),
            notices: this.commService.getNotices('PARENTS').pipe(catchError(() => of([]))),
            bookings: this.commService.getBookingsByGuardian('me').pipe(catchError(() => of([])))
        }).subscribe({
            next: (res) => {
                this.profile.set(res.profile);
                this.notices.set(res.notices);
                this.myBookings.set(res.bookings as MeetingBooking[]);
                this.loading.set(false);

                // Load attendance for each student
                res.profile.students?.forEach(s => this.loadAttendance(s.id));
            },
            error: () => {
                this.error.set('Could not load your profile. Please try again.');
                this.loading.set(false);
            }
        });
    }

    loadAttendance(studentId: string) {
        this.http.get<any[]>(`/api/attendance/student/${studentId}?limit=30`).pipe(
            catchError(() => of([]))
        ).subscribe(records => {
            const total = records.length;
            const present = records.filter(r => r.status === 'PRESENT').length;
            const absent = records.filter(r => r.status === 'ABSENT').length;
            const late = records.filter(r => r.status === 'LATE').length;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;

            this.attendanceMap.update(m => ({
                ...m,
                [studentId]: { total, present, absent, late, percentage: pct }
            }));
        });
    }

    setTab(tab: 'overview' | 'notices' | 'meetings') {
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
}
