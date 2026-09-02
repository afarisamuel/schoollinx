import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Teacher, AllocationAuditReport } from '../../domain/teacher.model';

@Injectable({
    providedIn: 'root'
})
export class TeacherService {
    private http = inject(HttpClient);
    private apiUrl = '/api/teachers';

    getTeachers(): Observable<Teacher[]> {
        return this.http.get<Teacher[]>(this.apiUrl);
    }

    getTeacher(id: string): Observable<Teacher> {
        return this.http.get<Teacher>(`${this.apiUrl}/${id}`);
    }

    getTeachersByCampus(campusId: string): Observable<Teacher[]> {
        return this.http.get<Teacher[]>(`${this.apiUrl}/campus/${campusId}`);
    }

    createTeacher(teacher: Teacher): Observable<Teacher> {
        return this.http.post<Teacher>(this.apiUrl, teacher);
    }

    updateTeacher(id: string, teacher: Teacher): Observable<Teacher> {
        return this.http.put<Teacher>(`${this.apiUrl}/${id}`, teacher);
    }

    deleteTeacher(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    bulkDeleteTeachers(ids: string[]): Observable<any> {
        return this.http.request('delete', this.apiUrl, { body: ids });
    }

    getAssignments(teacherId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${teacherId}/assignments`);
    }

    assignToClass(assignment: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/assign`, assignment);
    }

    unassignFromClass(assignmentId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/unassign/${assignmentId}`);
    }

    activateTeacherPortal(id: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${id}/activate`, {});
    }

    resetPassword(id: string): Observable<{ message: string; password: string }> {
        return this.http.post<{ message: string; password: string }>(`${this.apiUrl}/${id}/reset-password`, {});
    }

    uploadSignature(id: string, file: File): Observable<{ url: string }> {
        const formData = new FormData();
        formData.append('signature', file);
        return this.http.post<{ url: string }>(`${this.apiUrl}/${id}/signature`, formData);
    }

    getAllocationRecommendations(): Observable<AllocationAuditReport> {
        return this.http.get<AllocationAuditReport>(`${this.apiUrl}/recommendations/allocations`);
    }

    setClassMaster(classId: string, teacherId: string | null): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/classes/${classId}/master`, { teacher_id: teacherId || null });
    }
}
