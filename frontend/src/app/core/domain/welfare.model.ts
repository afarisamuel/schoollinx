export interface HealthRecord {
    id?: string;
    student_id: string;
    allergies: string;
    medical_conditions: string;
    required_medication: string;
    emergency_contact: string;
    blood_group: string;
    updated_at?: string;
    created_at?: string;
}

export interface BehaviorLog {
    id?: string;
    student_id: string;
    reported_by?: string;
    type: 'MERIT' | 'DEMERIT';
    category: string;
    description: string;
    action_taken: string;
    date: string;
    created_at?: string;
}
