import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Class } from './class.service';

export interface AcademicAssignment {
    id: string;
    teacher_id: string;
    class_id: string;
    subject_id?: string;
    academic_year: string;
    teacher?: any;
    class?: Class;
    subject?: any;
}

@Injectable({
    providedIn: 'root'
})
export class CurriculumService {
    private http = inject(HttpClient);


    // Assignment Methods
    getAssignmentsByClass(classId: string): Observable<AcademicAssignment[]> {
        return this.http.get<AcademicAssignment[]>(`/api/teachers/assignments/all?class_id=${classId}`);
    }

    getAssignmentsByTeacher(teacherId: string): Observable<AcademicAssignment[]> {
        return this.http.get<AcademicAssignment[]>(`/api/teachers/${teacherId}/assignments`);
    }

    assignTeacher(assignment: { teacher_id: string; class_id: string; subject_id?: string; academic_year: string }): Observable<any> {
        return this.http.post(`/api/teachers/assign`, assignment);
    }

    removeAssignment(id: string): Observable<any> {
        return this.http.delete(`/api/teachers/unassign/${id}`);
    }
}
