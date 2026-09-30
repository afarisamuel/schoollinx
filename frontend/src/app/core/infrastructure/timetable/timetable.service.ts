import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    TimetableEntry,
    ExamSession,
    TeacherUnavailability,
    TimetableAuditReport,
    RoomOccupancySlot,
    OptimizationResult,
    ExamInvigilationReport,
    ExamSessionWithInvigilation,
    MoveSlotResponse,
    TeacherAbsence,
    SubstituteLog,
    TimetableSnapshot,
    SubjectCognitiveWeight,
    TimetableTemplate,
    InvigilatorDutyLoadReport,
    AbsenceWithSubstitutes,
    SubstituteAssignResult,
    SnapshotRestoreResult
} from '../../domain/timetable.model';

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

    moveOrSwapSlot(
        entryId: string,
        targetDay: number,
        targetStartTime: string,
        targetEndTime: string,
        targetRoom?: string
    ): Observable<MoveSlotResponse> {
        return this.http.post<MoveSlotResponse>(`${this.apiUrl}/move-slot`, {
            entry_id: entryId,
            target_day: targetDay,
            target_start_time: targetStartTime,
            target_end_time: targetEndTime,
            target_room: targetRoom || ''
        });
    }

    getMasterSchedule(dayOfWeek: number = 1): Observable<TimetableEntry[]> {
        return this.http.get<TimetableEntry[]>(`${this.apiUrl}/master-schedule?day_of_week=${dayOfWeek}`);
    }

    getRoomOccupancy(dayOfWeek: number = 1): Observable<RoomOccupancySlot[]> {
        return this.http.get<RoomOccupancySlot[]>(`${this.apiUrl}/room-occupancy?day_of_week=${dayOfWeek}`);
    }

    optimizeAI(classId?: string): Observable<OptimizationResult> {
        return this.http.post<OptimizationResult>(`${this.apiUrl}/optimize-ai`, {
            class_id: classId || null
        });
    }

    generateExamSchedule(academicPeriodId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/exam/generate`, {
            academic_period_id: academicPeriodId
        });
    }

    autoAssignExamInvigilators(academicPeriodId: string): Observable<ExamInvigilationReport> {
        return this.http.post<ExamInvigilationReport>(`${this.apiUrl}/exam/auto-invigilate`, {
            academic_period_id: academicPeriodId
        });
    }

    getExamMasterSchedule(academicPeriodId: string): Observable<ExamSessionWithInvigilation[]> {
        return this.http.get<ExamSessionWithInvigilation[]>(`${this.apiUrl}/exam/master-schedule?academic_period_id=${academicPeriodId}`);
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

    autoGenerateTimetable(classId?: string, clearExisting = true): Observable<{ success: boolean; message: string; entries_count: number; classes_count: number }> {
        return this.http.post<{ success: boolean; message: string; entries_count: number; classes_count: number }>(`${this.apiUrl}/auto-generate`, {
            class_id: classId || null,
            clear_existing: clearExisting
        });
    }

    clearClassTimetable(classId: string): Observable<{ success: boolean; message: string }> {
        return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/class/${classId}/clear`);
    }

    getAvailableTeachers(dayOfWeek: number, startTime: string, endTime: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/available-teachers?day_of_week=${dayOfWeek}&start_time=${startTime}&end_time=${endTime}`);
    }

    auditTimetable(classId?: string): Observable<TimetableAuditReport> {
        const query = classId ? `?class_id=${classId}` : '';
        return this.http.get<TimetableAuditReport>(`${this.apiUrl}/audit${query}`);
    }

    getTeacherUnavailabilities(teacherId?: string): Observable<TeacherUnavailability[]> {
        const query = teacherId ? `?teacher_id=${teacherId}` : '';
        return this.http.get<TeacherUnavailability[]>(`${this.apiUrl}/unavailability${query}`);
    }

    addTeacherUnavailability(unavail: Partial<TeacherUnavailability>): Observable<TeacherUnavailability> {
        return this.http.post<TeacherUnavailability>(`${this.apiUrl}/unavailability`, unavail);
    }

    deleteTeacherUnavailability(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/unavailability/${id}`);
    }

    sendDailyDigest(dayOfWeek?: number): Observable<{ success: boolean; dispatched_count: number; message: string }> {
        return this.http.post<{ success: boolean; dispatched_count: number; message: string }>(`${this.apiUrl}/send-digest`, {
            day_of_week: dayOfWeek || (new Date().getDay() || 1)
        });
    }

    getClassFeedUrl(classId: string): string {
        return `${window.location.origin}/api/timetable/feed/class/${classId}/schedule.ics`;
    }

    getTeacherFeedUrl(teacherId: string): string {
        return `${window.location.origin}/api/timetable/feed/teacher/${teacherId}/schedule.ics`;
    }

    // ──────────────── Recommendation Endpoints ────────────────

    // Rec #4: Teacher Absences & Substitution
    recordAbsence(teacherId: string, absentDate: string, reason: string): Observable<AbsenceWithSubstitutes> {
        return this.http.post<AbsenceWithSubstitutes>(`${this.apiUrl}/absence`, {
            teacher_id: teacherId,
            absent_date: absentDate,
            reason
        });
    }

    listAbsences(): Observable<TeacherAbsence[]> {
        return this.http.get<TeacherAbsence[]>(`${this.apiUrl}/absences`);
    }

    autoAssignSubstitutes(absenceId: string): Observable<SubstituteAssignResult> {
        return this.http.post<SubstituteAssignResult>(`${this.apiUrl}/absence/auto-substitute`, {
            absence_id: absenceId
        });
    }

    getSubstituteLogs(limit: number = 50): Observable<SubstituteLog[]> {
        return this.http.get<SubstituteLog[]>(`${this.apiUrl}/substitute-logs?limit=${limit}`);
    }

    // Rec #6: Timetable Snapshots (Version History & Rollback)
    createSnapshot(label: string): Observable<TimetableSnapshot> {
        return this.http.post<TimetableSnapshot>(`${this.apiUrl}/snapshot`, { label });
    }

    listSnapshots(): Observable<TimetableSnapshot[]> {
        return this.http.get<TimetableSnapshot[]>(`${this.apiUrl}/snapshots`);
    }

    restoreSnapshot(snapshotId: string): Observable<SnapshotRestoreResult> {
        return this.http.post<SnapshotRestoreResult>(`${this.apiUrl}/snapshot/${snapshotId}/restore`, {});
    }

    // Rec #7: Cognitive Weights
    setSubjectCognitiveWeight(subjectId: string, weight: number): Observable<SubjectCognitiveWeight> {
        return this.http.post<SubjectCognitiveWeight>(`${this.apiUrl}/cognitive-weight`, {
            subject_id: subjectId,
            weight
        });
    }

    getSubjectCognitiveWeights(): Observable<SubjectCognitiveWeight[]> {
        return this.http.get<SubjectCognitiveWeight[]>(`${this.apiUrl}/cognitive-weights`);
    }

    // Rec #8: Timetable Templates
    saveTemplate(name: string, isDefault: boolean = false): Observable<TimetableTemplate> {
        return this.http.post<TimetableTemplate>(`${this.apiUrl}/template`, {
            name,
            is_default: isDefault
        });
    }

    listTemplates(): Observable<TimetableTemplate[]> {
        return this.http.get<TimetableTemplate[]>(`${this.apiUrl}/templates`);
    }

    applyTemplate(templateId: string, classIds?: string[]): Observable<{ applied: number; message: string }> {
        return this.http.post<{ applied: number; message: string }>(`${this.apiUrl}/template/${templateId}/apply`, {
            class_ids: classIds || []
        });
    }

    // Rec #10: Invigilator Duty Load Balancing
    getInvigilatorDutyLoadReport(academicPeriodId: string): Observable<InvigilatorDutyLoadReport> {
        return this.http.get<InvigilatorDutyLoadReport>(`${this.apiUrl}/exam/invigilator-load?academic_period_id=${academicPeriodId}`);
    }

    rebalanceInvigilators(academicPeriodId: string, maxSessionsPerTeacher: number = 3): Observable<{ rebalanced: number; message: string }> {
        return this.http.post<{ rebalanced: number; message: string }>(`${this.apiUrl}/exam/rebalance-invigilators`, {
            academic_period_id: academicPeriodId,
            max_sessions_per_teacher: maxSessionsPerTeacher
        });
    }
}
