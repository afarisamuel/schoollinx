import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Subject, TimetableEntry } from '../../domain/subject.model';

@Injectable({
    providedIn: 'root'
})
export class AcademicService {
    private http = inject(HttpClient);
    private subjectUrl = '/api/subjects';
    private timetableUrl = '/api/timetable';

    // Mock data for immediate visual integration if needed
    private mockSubjects: Subject[] = [
        { id: 'sub-1', name: 'Mathematics', code: 'MATH101', credit_hours: 4 },
        { id: 'sub-2', name: 'English Literature', code: 'ENG201', credit_hours: 3 },
        { id: 'sub-3', name: 'Physics', code: 'PHYS101', credit_hours: 4 }
    ];

    getSubjects(): Observable<Subject[]> {
        return of(this.mockSubjects);
        // return this.http.get<Subject[]>(this.subjectUrl);
    }

    getClassTimetable(classId: string): Observable<TimetableEntry[]> {
        const mockEntries: TimetableEntry[] = [
            { id: 'tt-1', class_id: 'cl-1', subject_id: 'sub-1', teacher_id: 't-1', day_of_week: 1, start_time: '08:00', end_time: '09:30', room: 'A101', subject: this.mockSubjects[0] },
            { id: 'tt-2', class_id: 'cl-1', subject_id: 'sub-2', teacher_id: 't-2', day_of_week: 2, start_time: '10:00', end_time: '11:30', room: 'B202', subject: this.mockSubjects[1] },
            { id: 'tt-3', class_id: 'cl-1', subject_id: 'sub-3', teacher_id: 't-3', day_of_week: 1, start_time: '12:30', end_time: '14:00', room: 'C303', subject: this.mockSubjects[2] }
        ];
        return of(mockEntries);
        // return this.http.get<TimetableEntry[]>(`${this.timetableUrl}/class/${classId}`);
    }
}
