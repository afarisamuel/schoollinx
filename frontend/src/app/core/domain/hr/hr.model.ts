export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollStatus = 'PENDING' | 'PAID';

export interface StaffProfile {
    id: string;
    user_id?: string;
    user?: any;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
    job_title: string;
    department: string;
    base_salary: number;
    bank_account?: string;
    hire_date: string;
    created_at?: string;
    updated_at?: string;
}

export interface PayrollRecord {
    id: string;
    staff_id: string;
    staff?: StaffProfile;
    period_month: number;
    period_year: number;
    gross_pay: number;
    allowances: number;
    deductions: number;
    net_pay: number;
    allowances_breakdown?: string;
    deductions_breakdown?: string;
    status: PayrollStatus;
    payment_date?: string;
    created_at?: string;
}

export interface LeaveRequest {
    id: string;
    staff_id: string;
    staff?: StaffProfile;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason?: string;
    status: LeaveStatus;
    created_at?: string;
}

export interface LeaveBalance {
    id: string;
    staff_id: string;
    staff?: StaffProfile;
    leave_type: string;
    year: number;
    allocated_days: number;
    used_days: number;
    created_at?: string;
    updated_at?: string;
}

export interface DeductionType {
    id: string;
    name: string;
    description?: string;
    rate_type: 'PERCENTAGE' | 'FIXED';
    rate: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface AllowanceType {
    id: string;
    name: string;
    description?: string;
    rate_type: 'PERCENTAGE' | 'FIXED';
    rate: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface TaxBracket {
    id: string;
    min_income: number;
    max_income?: number;
    rate: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PerformanceReview {
    id: string;
    staff_id: string;
    staff?: StaffProfile;
    reviewer_id: string;
    review_date: string;
    review_period: string;
    score: number;
    comments: string;
    goals: string;
    strengths: string;
    areas_for_improvement: string;
    recommendation: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface StaffAttendance {
    id: string;
    staff_id: string;
    staff?: StaffProfile;
    date: string;
    clock_in?: string;
    clock_out?: string;
    status: AttendanceStatus;
    notes?: string;
    is_biometric: boolean;
    created_at?: string;
    updated_at?: string;
}
