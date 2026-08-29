import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notice {
    id?: string;
    title: string;
    content: string;
    target: string;
    is_active?: boolean;
    created_at?: string;
}

export interface Reminder {
    id?: string;
    title: string;
    message: string;
    target_audience: string;
    send_date: string;
    status?: string;
    channel?: string;
}

export interface SMSPayload {
    target_audience: string;
    message: string;
}

export interface MeetingSlot {
    id?: string;
    teacher_id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_booked?: boolean;
}

export interface MeetingBooking {
    id?: string;
    meeting_slot_id: string;
    guardian_id: string;
    student_id?: string;
    reason?: string;
    status?: string;
    slot?: MeetingSlot;
    created_at?: string;
}

export interface WhatsAppMessage {
    id?: string;
    phone_number: string;
    direction: string;
    content: string;
    status?: string;
    message_id?: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CommunicationService {
    private http = inject(HttpClient);

    createNotice(notice: Partial<Notice>): Observable<Notice> {
        return this.http.post<Notice>('/api/communication/notices', notice);
    }

    getNotices(target?: string): Observable<Notice[]> {
        const url = target ? `/api/communication/notices?target=${target}` : '/api/communication/notices';
        return this.http.get<Notice[]>(url);
    }

    scheduleReminder(reminder: Partial<Reminder>): Observable<Reminder> {
        return this.http.post<Reminder>('/api/communication/reminders', reminder);
    }

    getReminders(): Observable<Reminder[]> {
        return this.http.get<Reminder[]>('/api/communication/reminders');
    }

    sendUrgentSMS(payload: SMSPayload): Observable<{message: string}> {
        return this.http.post<{message: string}>('/api/communication/sms/send', payload);
    }

    getMeetingSlotsByTeacher(teacherID: string): Observable<MeetingSlot[]> {
        return this.http.get<MeetingSlot[]>(`/api/communication/meeting-slots/${teacherID}`);
    }

    bookMeeting(booking: Partial<MeetingBooking>): Observable<MeetingBooking> {
        return this.http.post<MeetingBooking>('/api/communication/meeting-bookings', booking);
    }

    getBookingsByGuardian(guardianID: string): Observable<MeetingBooking[]> {
        return this.http.get<MeetingBooking[]>(`/api/communication/meeting-bookings/guardian/${guardianID}`);
    }

    getWhatsAppMessages(): Observable<WhatsAppMessage[]> {
        return this.http.get<WhatsAppMessage[]>('/api/communication/whatsapp/messages');
    }

    sendWhatsAppMessage(phone_number: string, content: string): Observable<{status: string}> {
        return this.http.post<{status: string}>('/api/communication/whatsapp/send', {
            phone_number,
            content
        });
    }

    triggerBirthdayGreetings(): Observable<{message: string, count: number}> {
        return this.http.post<{message: string, count: number}>('/api/communication/birthdays/trigger', {});
    }

    triggerLockdown(): Observable<{message: string}> {
        return this.http.post<{message: string}>('/api/communication/emergency/lockdown', {});
    }
}
