import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Student } from '../../domain/student.model';
import { PaginatedResponse } from '../../domain/pagination.model';

@Injectable({
    providedIn: 'root'
})
export class StudentService {
    private http = inject(HttpClient);
    private apiUrl = '/api/students';

    /**
     * Fetches a paginated list of students from the backend.
     * Returns the full envelope including pagination metadata.
     */
    getStudentsPaginated(page: number = 1, limit: number = 50): Observable<PaginatedResponse<Student>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());
        return this.http.get<PaginatedResponse<Student>>(this.apiUrl, { params });
    }

    /**
     * Backward-compatible method that extracts just the data array.
     * Used by components that haven't migrated to pagination yet.
     */
    getStudents(): Observable<Student[]> {
        return this.getStudentsPaginated(1, 1000).pipe(map(res => res.data || []));
    }

    getStudent(id: string): Observable<Student> {
        return this.http.get<Student>(`${this.apiUrl}/${id}`);
    }

    getTimeline(id: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${id}/timeline`);
    }



    getStudentsByClass(classId: string): Observable<Student[]> {
        return this.http.get<Student[]>(`${this.apiUrl}/class/${classId}`);
    }

    enrollStudents(studentIds: string[], classId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/enroll`, {
            ids: studentIds,
            class_id: classId
        });
    }

    createStudent(student: Student): Observable<Student> {
        return this.http.post<Student>(this.apiUrl, student);
    }

    updateStudent(id: string, student: Student): Observable<Student> {
        return this.http.put<Student>(`${this.apiUrl}/${id}`, student);
    }

    linkStudentRFID(id: string, rfidToken: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${id}/rfid`, { rfid_token: rfidToken });
    }

    printTerminalReport(studentId: string, periodId: string, termId: string): Observable<Blob> {
        return this.http.get(`/api/reports/students/${studentId}/terminal?period_id=${periodId}&term_id=${termId}`, { responseType: 'blob' });
    }

    deleteStudent(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    bulkDeleteStudents(ids: string[]): Observable<any> {
        return this.http.request('delete', this.apiUrl, { body: ids });
    }

    exportCSV(): void {
        this.http.get(`${this.apiUrl}/export/csv`, { responseType: 'blob' }).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'students.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    exportExcel(): void {
        this.http.get(`${this.apiUrl}/export/excel`, { responseType: 'blob' }).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'students.xlsx';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    importFile(file: File): Observable<{ imported: number; failed: number; errors: string[] }> {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<{ imported: number; failed: number; errors: string[] }>(
            `${this.apiUrl}/import`, form
        );
    }

    downloadImportTemplate(format: 'csv' | 'excel'): void {
        this.http.get(`${this.apiUrl}/import/template`, { 
            params: { format },
            responseType: 'blob' 
        }).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `students_import_template.${format === 'csv' ? 'csv' : 'xlsx'}`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    promoteStudents(studentIds: string[], nextAcademicYear: string, nextClassId?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/promote`, {
            student_ids: studentIds,
            next_academic_year: nextAcademicYear,
            next_class_id: nextClassId
        });
    }
}
