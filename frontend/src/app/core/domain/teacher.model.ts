export interface Teacher {
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    dob?: string;
    subjects: any[]; // Array of Subject objects
    user_id?: string;
    can_collect_fees?: boolean;
    assignments?: TeacherClassAssignment[];
}

export interface TeacherClassAssignment {
    id?: string;
    teacher_id: string;
    class_id: string;
    subject_id?: string;
    academic_year: string;
    class?: any;
    subject?: any;
}
