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
