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
    exportGradesPDF(classId: string, term: string, subjectId?: string, subject?: string, periodId?: string): Observable<Blob> {
        let params: any = { term: term };
        if (subjectId) params.subject_id = subjectId;
        if (subject) params.subject = subject;
        if (periodId) params.period_id = periodId;
        return this.http.get(`${this.api}/my-classes/${classId}/grades/export`, {
            params,
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

    // Classroom Mastery Suite (Phase 1-3)
    getSeatingChart(classId: string): Observable<any> {
        return this.http.get<any>(`${this.api}/my-classes/${classId}/seating`);
    }

    saveSeatingChart(classId: string, chart: any): Observable<any> {
        return this.http.post<any>(`${this.api}/my-classes/${classId}/seating`, chart);
    }

    getLessonPlans(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/lesson-plans`);
    }

    createLessonPlan(classId: string, plan: any): Observable<any> {
        return this.http.post<any>(`${this.api}/my-classes/${classId}/lesson-plans`, plan);
    }

    updateLessonPlan(id: string, plan: any): Observable<any> {
        return this.http.put<any>(`${this.api}/lesson-plans/${id}`, plan);
    }

    getRubrics(): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/rubrics`);
    }

    createRubric(rubric: any): Observable<any> {
        return this.http.post<any>(`${this.api}/rubrics`, rubric);
    }

    createSickbayReferral(referral: any): Observable<any> {
        return this.http.post<any>(`${this.api}/sickbay-referrals`, referral);
    }

    getClassReferrals(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/sickbay-referrals`);
    }

    getClassResources(classId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/my-classes/${classId}/resources`);
    }

    createResource(classId: string, res: any): Observable<any> {
        return this.http.post<any>(`${this.api}/my-classes/${classId}/resources`, res);
    }

    awardHousePoints(payload: { house_id: string; student_id: string; points: number; reason: string }): Observable<any> {
        return this.http.post<any>('/api/houses/points', payload);
    }

    markAttendanceSweep(classId: string, date: string, entries: { student_id: string; status: string }[]): Observable<any> {
        return this.http.post<any>('/api/attendance/bulk', { class_id: classId, date, entries });
    }

    // Parent Consultations & Availability (Feature 20)
    getTeacherMeetingSlots(teacherId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/communication/meeting-slots/${teacherId}`);
    }

    createMeetingSlot(payload: { teacher_id: string; date: string; start_time: string; end_time: string }): Observable<any> {
        return this.http.post<any>('/api/communication/meeting-slots', payload);
    }

    getTeacherBookings(teacherId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/communication/meeting-bookings/teacher/${teacherId}`);
    }

    // Classroom Announcements (Feature 26)
    getNotices(): Observable<any[]> {
        return this.http.get<any[]>('/api/communication/notices');
    }

    createNotice(notice: { title: string; content: string; target: string }): Observable<any> {
        return this.http.post<any>('/api/communication/notices', notice);
    }

    // Weekly Timetable & Schedule (Feature 35)
    getTeacherTimetable(teacherId: string): Observable<any[]> {
        return this.http.get<any[]>(`/api/timetable/teacher/${teacherId}`);
    }

    // Teacher Cover / Substitution (Feature 37)
    getCoverRequests(): Observable<any[]> {
        return this.http.get<any[]>('/api/teacher-portal/cover-requests');
    }

    createCoverRequest(payload: any): Observable<any> {
        return this.http.post<any>('/api/teacher-portal/cover-requests', payload);
    }

    claimCoverRequest(id: string, coverTeacherId: string): Observable<any> {
        return this.http.put<any>(`/api/teacher-portal/cover-requests/${id}/claim`, { cover_teacher_id: coverTeacherId });
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
