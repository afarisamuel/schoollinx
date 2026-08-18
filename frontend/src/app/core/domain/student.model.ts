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
    class?: any; // Class
    level?: number;
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
    gender: string;

    relationship: string;
}
