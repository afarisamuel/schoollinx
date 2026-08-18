export interface AcademicTerm {
    id: string;
    academic_period_id: string;
    term_number: number;
    name: string;
    start_date: string;
    end_date: string;
    is_locked?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface AcademicPeriod {
    id: string;
    name: string;
    term_type: 'Semester' | 'Term' | 'Quarter';
    term_count: number;
    current_term: number;
    is_active: boolean;
    terms?: AcademicTerm[];
    created_at?: Date;
    updated_at?: Date;
}
