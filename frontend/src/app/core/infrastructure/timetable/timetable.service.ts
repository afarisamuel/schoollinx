import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimetableEntry, ExamSession } from '../../domain/timetable.model';

@Injectable({
    providedIn: 'root'
})
export class TimetableService {
    private http = inject(HttpClient);
    private apiUrl = '/api/timetable';

    addEntry(entry: TimetableEntry): Observable<TimetableEntry> {
        return this.http.post<TimetableEntry>(this.apiUrl, entry);
    }

    getClassTimetable(classId: string): Observable<TimetableEntry[]> {
        return this.http.get<TimetableEntry[]>(`${this.apiUrl}/class/${classId}`);
    }

    removeEntry(entryId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${entryId}`);
    }

    generateExamSchedule(academicPeriodId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/exam/generate`, {
            academic_period_id: academicPeriodId
        });
    }

    getExamSchedule(classId: string): Observable<ExamSession[]> {
        return this.http.get<ExamSession[]>(`${this.apiUrl}/exam/class/${classId}`);
    }

    getExamScheduleByPeriod(periodId: string): Observable<ExamSession[]> {
        return this.http.get<ExamSession[]>(`${this.apiUrl}/exam/period/${periodId}`);
    }

    createExamSession(session: Partial<ExamSession>): Observable<ExamSession> {
        return this.http.post<ExamSession>(`${this.apiUrl}/exam/session`, session);
    }

    deleteExamSession(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/exam/session/${id}`);
    }
}
