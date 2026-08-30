// GradeCategory can now be any string configured by the admin
export type GradeCategory = 'ASSIGNMENT' | 'QUIZ' | 'MIDTERM' | 'FINAL' | string;

export interface Grade {
    id: string;
    student_id: string;
    class_id: string;
    score: number;
    max_score: number;
    category: GradeCategory;
    subject: string;
    remarks: string;
    term: string;
    created_at?: string;
    updated_at?: string;
}

export interface GradeWeight {
    id?: string;
    class_id?: string;
    category: GradeCategory;
    weight: number; // percentage e.g. 30
}

export interface GradeTrajectoryPoint {
    subject: string;
    date: string;
    score: number;
}
