import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Attendance } from '../../domain/attendance.model';
import { OfflineSyncService } from '../offline/offline-sync.service';

export interface ScanEvent {
    id: string;
    device_id: string;
    rfid_token: string;
    timestamp: string;
    processed: boolean;
    student_id?: string;
    student_name?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    private http = inject(HttpClient);
    private offlineSync = inject(OfflineSyncService);
    private apiUrl = '/api/attendance';

    markAttendance(attendance: Attendance): Observable<Attendance> {
        this.offlineSync.queueOperation('POST', this.apiUrl, attendance);
        return of(attendance);
    }

    markBulkAttendance(attendances: Attendance[]): Observable<any> {
        this.offlineSync.queueOperation('POST', `${this.apiUrl}/bulk`, attendances);
        return of({ success: true, queued: true });
    }

    getStudentAttendance(studentId: string): Observable<Attendance[]> {
        return this.http.get<Attendance[]>(`${this.apiUrl}/student/${studentId}`);
    }

    getClassAttendance(classId: string, date: string): Observable<Attendance[]> {
        return this.http.get<Attendance[]>(`${this.apiUrl}/class/${classId}?date=${date}`);
    }

    // Hardware / Biometric integration
    processHardwareScan(deviceId: string, rfidToken: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/hardware/scan`, {
            device_id: deviceId,
            rfid_token: rfidToken
        });
    }

    getRecentScanEvents(): Observable<ScanEvent[]> {
        return this.http.get<ScanEvent[]>(`${this.apiUrl}/hardware/scans`);
    }
}
