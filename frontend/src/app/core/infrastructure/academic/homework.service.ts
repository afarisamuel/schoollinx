import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Homework, HomeworkSubmission } from '../../domain/homework.model';

@Injectable({
    providedIn: 'root'
})
export class HomeworkService {
    private http = inject(HttpClient);
    private apiUrl = '/api/homework';

    getHomeworksByClass(classId: string): Observable<Homework[]> {
        return this.http.get<Homework[]>(`${this.apiUrl}/class/${classId}`);
    }

    getHomeworksByTeacher(teacherId: string): Observable<Homework[]> {
        return this.http.get<Homework[]>(`${this.apiUrl}/teacher/${teacherId}`);
    }

    createHomework(homework: Partial<Homework>): Observable<Homework> {
        return this.http.post<Homework>(this.apiUrl, homework);
    }

    updateHomework(id: string, homework: Partial<Homework>): Observable<Homework> {
        return this.http.put<Homework>(`${this.apiUrl}/${id}`, homework);
    }

    deleteHomework(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    submitHomework(homeworkId: string, submission: Partial<HomeworkSubmission>): Observable<HomeworkSubmission> {
        return this.http.post<HomeworkSubmission>(`${this.apiUrl}/${homeworkId}/submissions`, submission);
    }

    getStudentSubmission(homeworkId: string, studentId: string): Observable<HomeworkSubmission> {
        return this.http.get<HomeworkSubmission>(`${this.apiUrl}/${homeworkId}/submissions/student/${studentId}`);
    }

    getHomeworkSubmissions(homeworkId: string): Observable<HomeworkSubmission[]> {
        return this.http.get<HomeworkSubmission[]>(`${this.apiUrl}/${homeworkId}/submissions`);
    }

    gradeSubmission(submissionId: string, score: number, feedback: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/submissions/${submissionId}/grade`, { score, feedback });
    }
}
