import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject, TimetableEntry } from '../../domain/subject.model';

@Injectable({
    providedIn: 'root'
})
export class AcademicService {
    private http = inject(HttpClient);
    private subjectUrl = '/api/subjects';
    private timetableUrl = '/api/timetable';

    getSubjects(): Observable<Subject[]> {
        return this.http.get<Subject[]>(this.subjectUrl);
    }

    getClassTimetable(classId: string): Observable<TimetableEntry[]> {
        return this.http.get<TimetableEntry[]>(`${this.timetableUrl}/class/${classId}`);
    }
}
