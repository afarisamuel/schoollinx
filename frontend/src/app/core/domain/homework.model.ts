export interface Homework {
    id?: string;
    title: string;
    description: string;
    due_date: string;
    class_id: string;
    subject: string;
    teacher_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface HomeworkSubmission {
    id?: string;
    homework_id: string;
    student_id: string;
    content: string;
    file_url?: string;
    score?: number;
    feedback?: string;
    submitted_at?: string;
    status: 'SUBMITTED' | 'LATE' | 'GRADED';
}
