export interface Teacher {
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    dob?: string;
    employee_id?: string;
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
    teacher?: Teacher;
}

export type TeacherWorkloadStatus = 'AVAILABLE' | 'OPTIMAL' | 'HEAVY' | 'OVERLOADED';

export interface TeacherWorkloadSummary {
    teacher_id: string;
    teacher_name: string;
    email: string;
    assigned_classes: number;
    assigned_subjects: number;
    total_assignments: number;
    is_class_master: boolean;
    class_master_of?: string[];
    specialties?: string[];
    status: TeacherWorkloadStatus;
}

export interface SubjectAllocationRecommendation {
    class_id: string;
    class_name: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    suggested_teacher?: TeacherWorkloadSummary;
    confidence_score: number;
    rationale: string;
    match_reason: string;
}

export interface ClassMasterRecommendation {
    class_id: string;
    class_name: string;
    suggested_teacher?: TeacherWorkloadSummary;
    rationale: string;
}

export interface AllocationAuditReport {
    total_teachers: number;
    total_classes: number;
    total_subjects: number;
    total_active_assignments: number;
    unassigned_subjects_count: number;
    classes_without_master_count: number;
    underutilized_teachers_count: number;
    overloaded_teachers_count: number;
    workloads: TeacherWorkloadSummary[];
    subject_recommendations: SubjectAllocationRecommendation[];
    class_master_recommendations: ClassMasterRecommendation[];
}

