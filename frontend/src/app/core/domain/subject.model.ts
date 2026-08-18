export interface Subject {
    id?: string;
    name: string;
    code: string;
    credit_hours: number;
}

export interface TimetableEntry {
    id?: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number; // 1-5
    start_time: string;
    end_time: string;
    room: string;
    subject?: Subject; // Optional for nested display
}
