import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TeacherAssignment {
    id: string;
    teacher_id: string;
    class_id: string;
    subject_id: string;
    academic_year: string;
    class?: { id: string; name: string };
    subject?: { id: string; name: string; code: string };
    teacher?: { id: string; first_name: string; last_name: string };
}

export interface MyClassesResponse {
    teacher: { id: string; first_name: string; last_name: string; subject: string; can_collect_fees?: boolean };
    assignments: TeacherAssignment[];
}

export interface GradeEntry {
    id?: string;
    student_id: string;
    subject: string;
    category: string;
    score: number;
    max_score: number;
    term: string;
    remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class TeacherPortalService {
    private http = inject(HttpClient);
    private api = '/api/teacher-portal';

    getMyClasses(): Observable<MyClassesResponse> {
        return this.http.get<MyClassesResponse>(`${this.api}/my-classes`);
    }

    getClassStudents(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/students`);
    }

    getClassGrades(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/grades`);
    }

    bulkSubmitGrades(classId: string, grades: GradeEntry[]): Observable<any> {
        return this.http.post(`${this.api}/my-classes/${classId}/grades`, grades);
    }

    getClassWeights(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/weights`);
    }

    updateClassWeights(classId: string, weights: any[]): Observable<any> {
        return this.http.put(`${this.api}/my-classes/${classId}/weights`, weights);
    }

    getClassGPA(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/gpa`);
    }

    curveGrades(classId: string, term: string, method: string, factor: number): Observable<any> {
        return this.http.post(`${this.api}/my-classes/${classId}/curve`, { term, method, factor });
    }

    getGradeHistory(gradeId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/grades/${gradeId}/history`);
    }

    importGradesCSV(classId: string, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.api}/my-classes/${classId}/grades/import`, formData);
    }

    // Phase 19: PDF Export
    exportGradesPDF(classId: string, term: string): Observable<Blob> {
        return this.http.get(`${this.api}/my-classes/${classId}/grades/export`, {
            params: { term: term },
            responseType: 'blob'
        });
    }

    getStudentEvaluation(classId: string, studentId: string, periodId: string, termId: string): Observable<any> {
        return this.http.get(`${this.api}/my-classes/${classId}/students/${studentId}/evaluations`, {
            params: { period_id: periodId, term_id: termId }
        });
    }

    updateStudentEvaluation(classId: string, studentId: string, evalData: any): Observable<any> {
        return this.http.put(`${this.api}/my-classes/${classId}/students/${studentId}/evaluations`, evalData);
    }
}

@Injectable({ providedIn: 'root' })
export class TeacherAssignmentService {
    private http = inject(HttpClient);
    private api = '/api/teacher-assignments';

    getAll(): Observable<TeacherAssignment[]> {
        return this.http.get<TeacherAssignment[]>(this.api);
    }

    assign(data: Partial<TeacherAssignment>): Observable<TeacherAssignment> {
        return this.http.post<TeacherAssignment>(this.api, data);
    }

    bulkAssign(assignments: Partial<TeacherAssignment>[]): Observable<any> {
        return this.http.post(`${this.api}/bulk`, assignments);
    }

    unassign(id: string): Observable<any> {
        return this.http.delete(`${this.api}/${id}`);
    }
}
