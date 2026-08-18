export type AttendanceStatus = 'Present' | 'Absent' | 'Tardy';

export interface Attendance {
    id?: string;
    student_id: string;
    class_id: string;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
}

export interface AttendanceBatch {
    class_id: string;
    date: string;
    records: { student_id: string; status: AttendanceStatus; remarks?: string }[];
}
