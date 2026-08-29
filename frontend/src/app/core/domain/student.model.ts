export interface Student {
    id?: string;
    photo_url?: string;
    // --- Core Identity ---
    first_name: string;
    last_name: string;
    other_name?: string;
    gender: string;
    dob: string;
    phone_number?: string;
    address?: string;

    // --- Placement Details ---
    placed_residence_type?: string;

    // --- Family & Health ---
    father_name?: string;
    father_phone?: string;
    father_email?: string;
    father_occupation?: string;
    mother_name?: string;
    mother_phone?: string;
    mother_email?: string;
    mother_occupation?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    guardian_relation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    health_conditions?: string;
    allergies?: string;
    blood_group?: string;

    // --- System Associations ---
    enrollment_num?: string;
    class_id?: string;
    class_name?: string;
    class?: any; // Class
    level?: number;
    prepaid_balance?: number;
    academic_year?: string;
    status?: string;

    // --- Relationships ---
    guardians?: Guardian[];
}

export interface Guardian {
    id?: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number: string;
    address?: string;
    gender?: string;
    relationship: string;
    is_primary?: boolean;
    can_pickup?: boolean;
    pickup_code?: string;
    students?: Student[];
    created_at?: string;
}

export interface AbsenceRequest {
    id?: string;
    guardian_id?: string;
    guardian?: Guardian;
    student_id: string;
    student?: Student;
    start_date: string;
    end_date: string;
    reason: string;
    notes?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewed_by?: string;
    review_notes?: string;
    created_at?: string;
}

export interface FamilyMemberFee {
    student_id: string;
    student_name: string;
    class_name: string;
    total_billed: number;
    total_paid: number;
    balance_due: number;
}

export interface FamilyLedgerSummary {
    guardian_id: string;
    guardian_name: string;
    total_wards: number;
    total_family_billed: number;
    total_family_paid: number;
    total_family_balance: number;
    sibling_discount_pct: number;
    wards: FamilyMemberFee[];
}

export interface PickupPass {
    guardian_id: string;
    guardian_name: string;
    relationship: string;
    can_pickup: boolean;
    pickup_code: string;
    students: Student[];
}
