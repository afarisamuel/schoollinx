import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FeeCategory = 'TERM_FEE' | 'TUITION' | 'CANTEEN' | 'TRANSPORT' | 'LAB' | 'LIBRARY_FINE' | 'EXTRACURRICULAR' | string;
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | string;

export interface FeeBreakdownItem {
    category: FeeCategory;
    amount: number;
}

export interface FiscalRecord {
    id: string;
    student_id: string;
    student?: {
        first_name: string;
        last_name: string;
        class?: { id: string; name: string };
    };
    category: FeeCategory;
    amount: number;
    amount_paid?: number;
    balance_due?: number;
    description: string;
    breakdown?: FeeBreakdownItem[];
    status: PaymentStatus;
    due_date: string;
    paid_at?: string;
}

export interface FiscalSummary {
    total_receivables: number;
    total_overdue: number;
    collections_mtd: number;
}

export interface FinancialRecommendation {
    type: 'ALERT' | 'OPTIMIZATION' | 'REVENUE_OPPORTUNITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    action: string;
}

export interface FeeStructure {
    id?: string;
    academic_period_id: string;
    category: FeeCategory;
    amount: number;
    frequency?: string;
    is_term_fee?: boolean;
    all_classes?: boolean;
    class_ids?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface Budget {
    id: string;
    academic_year: string;
    category: string;
    allocated_amount: number;
    spent_amount: number;
}

export interface ExpenseClaim {
    id: string;
    requestor_id: string;
    amount: number;
    description: string;
    status: 'PENDING_MANAGER' | 'PENDING_FINANCE' | 'APPROVED' | 'REJECTED' | 'PAID';
    receipt_url?: string;
    created_at: string;
}

export type ScholarshipType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type ScholarshipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'REVOKED';

export interface Scholarship {
    id?: string;
    student_id: string;
    student?: { first_name: string; last_name: string; enrollment_num?: string; };
    name: string;
    type: ScholarshipType;
    value: number;
    status?: ScholarshipStatus;
    valid_from: string;
    valid_until: string;
    reason?: string;
    created_at?: string;
    updated_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class FiscalService {
    private http = inject(HttpClient);
    private apiUrl = '/api/fiscal';

    getFeeStructures(periodId: string): Observable<FeeStructure[]> {
        return this.http.get<FeeStructure[]>(`${this.apiUrl}/structures/${periodId}`);
    }

    deleteFeeStructure(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/structures/${id}`);
    }

    setFeeStructure(structure: Partial<FeeStructure>): Observable<FeeStructure> {
        return this.http.post<FeeStructure>(`${this.apiUrl}/structures`, structure);
    }

    getRecords(): Observable<FiscalRecord[]> {
        return this.http.get<FiscalRecord[]>(`${this.apiUrl}/records`);
    }

    getStudentFiscalStatus(studentId: string): Observable<{ balance: number, records: FiscalRecord[] }> {
        return this.http.get<{ balance: number, records: FiscalRecord[] }>(`${this.apiUrl}/students/${studentId}`);
    }

    printPupilBill(studentId: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/students/${studentId}/bill/print`, { responseType: 'blob' });
    }

    printClassBills(classId: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/classes/${classId}/bills/print`, { responseType: 'blob' });
    }

    getSummary(): Observable<FiscalSummary> {
        return this.http.get<FiscalSummary>(`${this.apiUrl}/summary`);
    }

    getRecommendations(): Observable<FinancialRecommendation[]> {
        return this.http.get<FinancialRecommendation[]>(`${this.apiUrl}/recommendations`);
    }

    topUpWallet(studentId: string, amount: number, description: string): Observable<{status: string}> {
        return this.http.post<{status: string}>(`${this.apiUrl}/wallet/topup/${studentId}`, {
            amount,
            description
        });
    }

    getWalletInfo(studentId: string): Observable<{ balance: number; transactions: any[] }> {
        return this.http.get<{ balance: number; transactions: any[] }>(`${this.apiUrl}/wallet/${studentId}`);
    }

    createFee(record: Partial<FiscalRecord>): Observable<FiscalRecord> {
        return this.http.post<FiscalRecord>(`${this.apiUrl}/records`, record);
    }

    processPayment(recordId: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/records/${recordId}/pay`, {});
    }

    processPartialPayment(recordId: string, amount: number, note: string): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/records/${recordId}/partial-pay`, { amount, note });
    }

    applyLateFees(penaltyRatePct = 5.0, daysGracePeriod = 7): Observable<{ message: string; applied_count: number }> {
        return this.http.post<{ message: string; applied_count: number }>(`${this.apiUrl}/apply-late-fees`, {
            penalty_rate_pct: penaltyRatePct,
            days_grace_period: daysGracePeriod
        });
    }

    getConsolidatedFamilyInvoice(guardianId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/family-invoice/${guardianId}`);
    }

    getReceipt(recordId: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/records/${recordId}/receipt`, { responseType: 'blob' });
    }

    refreshOverdue(): Observable<{ status: string }> {
        return this.http.post<{ status: string }>(`${this.apiUrl}/refresh-overdue`, {});
    }

    generateTermFees(periodId: string): Observable<{ message: string, count: number }> {
        return this.http.post<{ message: string, count: number }>(`${this.apiUrl}/generate-term-fees/${periodId}`, {});
    }

    getDefaulters(): Observable<{ defaulters: FiscalRecord[], count: number }> {
        return this.http.get<{ defaulters: FiscalRecord[], count: number }>(`${this.apiUrl}/defaulters`);
    }

    getInvoice(recordId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/records/${recordId}/invoice`);
    }

    // Budgets
    getBudgets(academicYear: string): Observable<Budget[]> {
        return this.http.get<Budget[]>(`${this.apiUrl}/budgets?academic_year=${academicYear}`);
    }
    createBudget(budget: Partial<Budget>): Observable<Budget> {
        return this.http.post<Budget>(`${this.apiUrl}/budgets`, budget);
    }
    recordExpenditure(exp: { budget_id: string, amount: number, description: string, date: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/expenditures`, exp);
    }

    // Expense Claims
    getExpenseClaims(status?: string): Observable<ExpenseClaim[]> {
        const url = status ? `${this.apiUrl}/expense-claims?status=${status}` : `${this.apiUrl}/expense-claims`;
        return this.http.get<ExpenseClaim[]>(url);
    }
    submitExpenseClaim(claim: Partial<ExpenseClaim>): Observable<ExpenseClaim> {
        return this.http.post<ExpenseClaim>(`${this.apiUrl}/expense-claims`, claim);
    }
    reviewExpenseClaim(id: string, approved: boolean, reviewerId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/expense-claims/${id}/review`, { approved, reviewer_id: reviewerId });
    }

    // Daily Bills
    generateDailyBills(amount: number): Observable<{ message: string; count: number }> {
        return this.http.post<{ message: string; count: number }>(`${this.apiUrl}/daily-bills/generate`, { amount });
    }
    generateDailyBillsFromConfig(periodId: string): Observable<{ message: string; count: number; amount: number; categories: string[] }> {
        return this.http.post<{ message: string; count: number; amount: number; categories: string[] }>(`${this.apiUrl}/daily-bills/generate-from-config`, { period_id: periodId });
    }
    getTodaysBills(): Observable<{ bills: DailyBill[]; total: number; paid: number; pending: number }> {
        return this.http.get<{ bills: DailyBill[]; total: number; paid: number; pending: number }>(`${this.apiUrl}/daily-bills/today`);
    }
    getPendingBills(): Observable<{ bills: DailyBill[]; count: number }> {
        return this.http.get<{ bills: DailyBill[]; count: number }>(`${this.apiUrl}/daily-bills/pending`);
    }

    generateDailyBillsForRoute(routeId: string, periodId: string): Observable<{ message: string; count: number; amount: number; categories: string[] }> {
        return this.http.post<{ message: string; count: number; amount: number; categories: string[] }>(`${this.apiUrl}/daily-bills/generate/route/${routeId}`, { period_id: periodId });
    }

    generateDailyBillsForWalkIns(periodId: string): Observable<{ message: string; count: number; amount: number; categories: string[] }> {
        return this.http.post<{ message: string; count: number; amount: number; categories: string[] }>(`${this.apiUrl}/daily-bills/generate/walk-ins`, { period_id: periodId });
    }

    getPendingBillsByRoute(routeId: string): Observable<{ bills: DailyBill[]; count: number }> {
        return this.http.get<{ bills: DailyBill[]; count: number }>(`${this.apiUrl}/daily-bills/pending/route/${routeId}`);
    }

    getPendingBillsForWalkIns(): Observable<{ bills: DailyBill[]; count: number }> {
        return this.http.get<{ bills: DailyBill[]; count: number }>(`${this.apiUrl}/daily-bills/pending/walk-ins`);
    }
    collectBill(billId: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/daily-bills/${billId}/collect`, {});
    }
    getMyCollections(): Observable<{ bills: DailyBill[]; count: number; total_collected: number }> {
        return this.http.get<{ bills: DailyBill[]; count: number; total_collected: number }>(`${this.apiUrl}/daily-bills/my-collections`);
    }
    getStudentDailyBills(studentId: string): Observable<{ bills: DailyBill[]; count: number }> {
        return this.http.get<{ bills: DailyBill[]; count: number }>(`${this.apiUrl}/daily-bills/students/${studentId}`);
    }
    runOverdueAudit(): Observable<{ message: string; marked_overdue: number }> {
        return this.http.post<{ message: string; marked_overdue: number }>(`${this.apiUrl}/daily-bills/run-overdue-audit`, {});
    }

    // Teacher Privileges
    toggleTeacherPrivilege(teacherId: string, canCollectFees: boolean): Observable<any> {
        return this.http.put<any>(`/api/teachers/${teacherId}/privileges`, { can_collect_fees: canCollectFees });
    }

    // Scholarships
    applyScholarship(scholarship: Partial<Scholarship>): Observable<Scholarship> {
        return this.http.post<Scholarship>(`${this.apiUrl}/scholarships`, scholarship);
    }
    getAllScholarships(): Observable<Scholarship[]> {
        return this.http.get<Scholarship[]>(`${this.apiUrl}/scholarships`);
    }
    getScholarshipsByStudent(studentId: string): Observable<Scholarship[]> {
        return this.http.get<Scholarship[]>(`${this.apiUrl}/scholarships/student/${studentId}`);
    }
    updateScholarshipStatus(id: string, status: ScholarshipStatus): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/scholarships/${id}/status`, { status });
    }

    // Year-End Rollover
    getYearEndSummary(): Observable<{
        total_outstanding: number;
        total_overdue: number;
        students_with_debt: number;
        total_carry_over: number;
    }> {
        return this.http.get<any>(`${this.apiUrl}/year-end/summary`);
    }

    performYearEndRollover(newPeriodId: string): Observable<{
        records_carried_over: number;
        total_amount_rolled: number;
        scholarships_revoked: number;
        message: string;
    }> {
        return this.http.post<any>(`${this.apiUrl}/year-end/rollover`, { new_period_id: newPeriodId });
    }

    // Milestone 2: Installments, Sibling Discounts & Multi-Currency
    getInstallmentAgreements(studentId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/installments/student/${studentId}`);
    }

    payInstallmentMilestone(milestoneId: string, amount: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/installments/milestones/${milestoneId}/pay`, { amount });
    }

    getSiblingDiscount(studentId: string, baseTuition?: number): Observable<any> {
        const url = baseTuition 
            ? `${this.apiUrl}/discounts/sibling/${studentId}?base_tuition=${baseTuition}`
            : `${this.apiUrl}/discounts/sibling/${studentId}`;
        return this.http.get<any>(url);
    }

    setBaselineTuition(amount: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/baseline-tuition`, { amount });
    }

    getLiveExchangeRates(): Observable<Record<string, number>> {
        return this.http.get<Record<string, number>>(`${this.apiUrl}/rates`);
    }

    canteenPOSCharge(payload: { student_id: string; amount: number; item_name: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/canteen/pos-charge`, payload);
    }

    // Installment Settings
    getInstallmentSettings(): Observable<InstallmentPlanTemplate> {
        return this.http.get<InstallmentPlanTemplate>(`${this.apiUrl}/installment-settings`);
    }

    saveInstallmentSettings(settings: Partial<InstallmentPlanTemplate>): Observable<InstallmentPlanTemplate> {
        return this.http.post<InstallmentPlanTemplate>(`${this.apiUrl}/installment-settings`, settings);
    }

    // Bill Template Customization & Supplies
    getBillConfig(): Observable<BillTemplateConfig> {
        return this.http.get<BillTemplateConfig>(`${this.apiUrl}/bill-config`);
    }

    saveBillConfig(config: Partial<BillTemplateConfig>): Observable<BillTemplateConfig> {
        return this.http.post<BillTemplateConfig>(`${this.apiUrl}/bill-config`, config);
    }
}

export interface BillSupplyItem {
    category: string;
    description: string;
    quantity: string;
    note: string;
    price?: number | null;
}

export interface BillTemplateConfig {
    id?: string;
    title: string;
    subtitle?: string;
    footer_notes: string;
    bank_details?: string;
    payment_instructions?: string;
    show_supplies_table: boolean;
    supplies_title: string;
    required_items: BillSupplyItem[];
}

export interface InstallmentPlanMilestoneDef {
    index: number;
    title: string;
    description: string;
    percentage: number;
    due_trigger?: string;
}

export interface InstallmentPlanTemplate {
    id?: string;
    name: string;
    schedule_text: string;
    is_enabled: boolean;
    milestones: InstallmentPlanMilestoneDef[];
}

export type DailyBillStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface DailyBill {
    id: string;
    student_id: string;
    student?: { first_name: string; last_name: string; class?: { id: string; name: string } };
    amount: number;
    date: string;
    status: DailyBillStatus;
    collected_by?: string;
    collected_at?: string;
}

