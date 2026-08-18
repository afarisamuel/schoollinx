import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Exam {
    id: string;
    title: string;
    description: string;
    academic_year: string;
    term: string;
    status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
    start_date: string;
    end_date: string;
    schedules?: ExamSchedule[];
}

export interface ExamSchedule {
    id: string;
    exam_id: string;
    class_id: string;
    subject: string;
    date: string;
    start_time: string;
    end_time: string;
    max_score: number;
    class?: any;
}

export interface ExamResult {
    id: string;
    exam_schedule_id: string;
    student_id: string;
    score: number;
    remarks: string;
}

@Injectable({
    providedIn: 'root'
})
export class ExamService {
    private http = inject(HttpClient);
    private apiUrl = '/api/exams';

    getExams(): Observable<Exam[]> {
        return this.http.get<Exam[]>(this.apiUrl);
    }

    getExam(id: string): Observable<Exam> {
        return this.http.get<Exam>(`${this.apiUrl}/${id}`);
    }

    createExam(exam: Partial<Exam>): Observable<Exam> {
        return this.http.post<Exam>(this.apiUrl, exam);
    }

    updateExam(id: string, exam: Partial<Exam>): Observable<Exam> {
        return this.http.put<Exam>(`${this.apiUrl}/${id}`, exam);
    }

    addSchedule(examId: string, schedule: Partial<ExamSchedule>): Observable<ExamSchedule> {
        return this.http.post<ExamSchedule>(`${this.apiUrl}/${examId}/schedules`, schedule);
    }

    getSchedules(examId: string): Observable<ExamSchedule[]> {
        return this.http.get<ExamSchedule[]>(`${this.apiUrl}/${examId}/schedules`);
    }

    submitResults(scheduleId: string, results: ExamResult[]): Observable<any> {
        return this.http.post(`${this.apiUrl}/schedules/${scheduleId}/results`, { results });
    }

    getResults(scheduleId: string): Observable<ExamResult[]> {
        return this.http.get<ExamResult[]>(`${this.apiUrl}/schedules/${scheduleId}/results`);
    }
}
