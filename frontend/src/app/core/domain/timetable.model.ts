export interface TimetableEntry {
    id?: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    start_time: string;  // e.g. "08:00"
    end_time: string;    // e.g. "09:30"
    room?: string;
    created_at?: string;
}

export interface TeacherUnavailability {
    id?: string;
    teacher_id: string;
    day_of_week: number;
    start_time?: string;
    end_time?: string;
    reason?: string;
}

export interface TimetableConflict {
    type: string; // 'teacher_double_booked' | 'room_double_booked' | 'teacher_fatigue' | 'teacher_unavailable'
    severity: 'critical' | 'warning';
    message: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    class_id?: string;
    class_name?: string;
    subject_id?: string;
    subject_name?: string;
    teacher_id?: string;
    teacher_name?: string;
    room?: string;
    entry_id?: string;
}

export interface TimetableAuditSummary {
    total_entries: number;
    total_conflicts: number;
    teacher_overlaps: number;
    room_overlaps: number;
    fatigue_violations: number;
    unavailability_violations: number;
    health_score: number;
}

export interface TimetableAuditReport {
    summary: TimetableAuditSummary;
    conflicts: TimetableConflict[];
}

export interface ExamSession {
    id?: string;
    subject_id: string;
    class_id: string;
    facility_id: string;
    academic_period_id: string;
    date: string;
    start_time: string;
    end_time: string;
}

export interface RoomOccupancySlot {
    room: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_occupied: boolean;
    class_id?: string;
    class_name?: string;
    subject_name?: string;
    teacher_name?: string;
}

export interface OptimizationResult {
    fitness_score: number;
    iterations: number;
    conflicts_resolved: number;
    elapsed_ms: number;
    entries_count: number;
    message: string;
}

export interface ExamSessionWithInvigilation {
    session_id: string;
    date: string;
    start_time: string;
    end_time: string;
    class_id: string;
    class_name: string;
    subject_id: string;
    subject_name: string;
    facility_id: string;
    room_name: string;
    invigilators: {
        id: string;
        user_id?: string;
        title?: string;
        specialization?: string;
    }[];
}

export interface ExamInvigilationReport {
    total_sessions: number;
    invigilators_assigned: number;
    rooms_allocated: number;
    sessions: ExamSessionWithInvigilation[];
}

export interface MoveSlotResponse {
    success: boolean;
    moved: TimetableEntry;
    swapped?: TimetableEntry;
    message: string;
}

export interface TeacherAbsence {
    id?: string;
    teacher_id: string;
    teacher_name?: string;
    absent_date: string;
    reason?: string;
    resolved_at?: string;
    substitute_id?: string;
    substitute_name?: string;
    notified?: boolean;
    created_at?: string;
}

export interface SubstituteLog {
    id?: string;
    timetable_entry_id: string;
    original_teacher_id: string;
    original_teacher_name?: string;
    substitute_id: string;
    substitute_name?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    taught_at: string;
    note?: string;
    created_at?: string;
}

export interface TimetableSnapshot {
    id?: string;
    label: string;
    snapshot_json?: string;
    created_at?: string;
}

export interface SubjectCognitiveWeight {
    id?: string;
    subject_id: string;
    subject_name?: string;
    weight: number; // 1 to 5
}

export interface TimetableTemplate {
    id?: string;
    name: string;
    template_json?: string;
    is_default?: boolean;
    created_at?: string;
}

export interface InvigilatorDutyLoad {
    teacher: any;
    session_count: number;
    total_minutes: number;
    load_percentage: number;
    is_overloaded: boolean;
}

export interface InvigilatorDutyLoadReport {
    average_minutes: number;
    total_sessions: number;
    max_minutes: number;
    loads: InvigilatorDutyLoad[];
    overloaded_count: number;
}

export interface AbsenceWithSubstitutes {
    absence: TeacherAbsence;
    affected_slots: TimetableEntry[];
    available_substitutes: any[];
}

export interface SubstituteAssignResult {
    assigned: number;
    notified: number;
    message: string;
}

export interface SnapshotRestoreResult {
    restored: number;
    cleared: number;
    message: string;
}
