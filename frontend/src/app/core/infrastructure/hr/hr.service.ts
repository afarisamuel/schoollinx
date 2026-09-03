import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StaffProfile, PayrollRecord, LeaveRequest, LeaveStatus, DeductionType, AllowanceType, TaxBracket, PerformanceReview, LeaveBalance, StaffAttendance } from '../../domain/hr/hr.model';

@Injectable({
    providedIn: 'root'
})
export class HrService {
    private http = inject(HttpClient);
    private apiUrl = '/api/hr';

    // Staff
    getStaffProfiles(): Observable<StaffProfile[]> {
        return this.http.get<StaffProfile[]>(`${this.apiUrl}/staff`);
    }

    createStaffProfile(profile: Partial<StaffProfile>): Observable<StaffProfile> {
        return this.http.post<StaffProfile>(`${this.apiUrl}/staff`, profile);
    }

    updateStaffProfile(id: string, profile: Partial<StaffProfile>): Observable<StaffProfile> {
        return this.http.put<StaffProfile>(`${this.apiUrl}/staff/${id}`, profile);
    }

    deleteStaffProfile(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/staff/${id}`);
    }

    // Payroll
    getPayrollHistory(month: number, year: number): Observable<PayrollRecord[]> {
        return this.http.get<PayrollRecord[]>(`${this.apiUrl}/payroll?month=${month}&year=${year}`);
    }

    processMonthlyPayroll(month: number, year: number): Observable<PayrollRecord[]> {
        return this.http.post<PayrollRecord[]>(`${this.apiUrl}/payroll/process?month=${month}&year=${year}`, {});
    }

    markPayrollPaid(payrollId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/payroll/${payrollId}/paid`, {});
    }

    downloadPayslip(payrollId: string): void {
        window.open(`${this.apiUrl}/payroll/${payrollId}/payslip`, '_blank');
    }

    downloadSSNITSchedule(month?: string): void {
        const query = month ? `?month=${month}` : '';
        window.open(`${this.apiUrl}/payroll/ssnit-schedule${query}`, '_blank');
    }

    downloadGRASchedule(month?: string): void {
        const query = month ? `?month=${month}` : '';
        window.open(`${this.apiUrl}/payroll/gra-schedule${query}`, '_blank');
    }

    // Leave
    getLeaveRequests(): Observable<LeaveRequest[]> {
        return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave`);
    }

    submitLeaveRequest(request: Partial<LeaveRequest>): Observable<LeaveRequest> {
        return this.http.post<LeaveRequest>(`${this.apiUrl}/leave`, request);
    }

    updateLeaveStatus(leaveId: string, status: LeaveStatus): Observable<any> {
        return this.http.patch(`${this.apiUrl}/leave/${leaveId}/status`, { status });
    }

    // Leave Balances
    allocateLeaveBalance(lb: Partial<LeaveBalance>): Observable<LeaveBalance> {
        return this.http.post<LeaveBalance>(`${this.apiUrl}/leave/balances`, lb);
    }

    getAllLeaveBalances(year: number = new Date().getFullYear()): Observable<LeaveBalance[]> {
        return this.http.get<LeaveBalance[]>(`${this.apiUrl}/leave/balances?year=${year}`);
    }

    getStaffLeaveBalances(staffId: string, year: number = new Date().getFullYear()): Observable<LeaveBalance[]> {
        return this.http.get<LeaveBalance[]>(`${this.apiUrl}/leave/balances/${staffId}?year=${year}`);
    }

    // Deductions
    getDeductionTypes(): Observable<DeductionType[]> {
        return this.http.get<DeductionType[]>(`${this.apiUrl}/deductions`);
    }

    createDeductionType(dt: Partial<DeductionType>): Observable<DeductionType> {
        return this.http.post<DeductionType>(`${this.apiUrl}/deductions`, dt);
    }

    updateDeductionType(id: string, dt: Partial<DeductionType>): Observable<DeductionType> {
        return this.http.put<DeductionType>(`${this.apiUrl}/deductions/${id}`, dt);
    }

    deleteDeductionType(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/deductions/${id}`);
    }

    // Allowances
    getAllowanceTypes(): Observable<AllowanceType[]> {
        return this.http.get<AllowanceType[]>(`${this.apiUrl}/allowances`);
    }

    createAllowanceType(at: Partial<AllowanceType>): Observable<AllowanceType> {
        return this.http.post<AllowanceType>(`${this.apiUrl}/allowances`, at);
    }

    updateAllowanceType(id: string, at: Partial<AllowanceType>): Observable<AllowanceType> {
        return this.http.put<AllowanceType>(`${this.apiUrl}/allowances/${id}`, at);
    }

    deleteAllowanceType(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/allowances/${id}`);
    }

    // Tax Brackets
    getTaxBrackets(): Observable<TaxBracket[]> {
        return this.http.get<TaxBracket[]>(`${this.apiUrl}/tax-brackets`);
    }

    createTaxBracket(tb: Partial<TaxBracket>): Observable<TaxBracket> {
        return this.http.post<TaxBracket>(`${this.apiUrl}/tax-brackets`, tb);
    }

    updateTaxBracket(id: string, tb: Partial<TaxBracket>): Observable<TaxBracket> {
        return this.http.put<TaxBracket>(`${this.apiUrl}/tax-brackets/${id}`, tb);
    }

    deleteTaxBracket(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/tax-brackets/${id}`);
    }

    // Performance Reviews
    submitPerformanceReview(review: Partial<PerformanceReview>): Observable<PerformanceReview> {
        return this.http.post<PerformanceReview>(`${this.apiUrl}/performance`, review);
    }

    getAllPerformanceReviews(): Observable<PerformanceReview[]> {
        return this.http.get<PerformanceReview[]>(`${this.apiUrl}/performance`);
    }

    getStaffPerformanceReviews(staffId: string): Observable<PerformanceReview[]> {
        return this.http.get<PerformanceReview[]>(`${this.apiUrl}/performance/${staffId}`);
    }

    updatePerformanceReview(id: string, review: Partial<PerformanceReview>): Observable<PerformanceReview> {
        return this.http.put<PerformanceReview>(`${this.apiUrl}/performance/${id}`, review);
    }

    // Attendance
    clockIn(staffId: string, isBiometric: boolean = false): Observable<StaffAttendance> {
        return this.http.post<StaffAttendance>(`${this.apiUrl}/attendance/clock-in`, { staff_id: staffId, is_biometric: isBiometric });
    }

    clockOut(staffId: string, isBiometric: boolean = false): Observable<StaffAttendance> {
        return this.http.post<StaffAttendance>(`${this.apiUrl}/attendance/clock-out`, { staff_id: staffId, is_biometric: isBiometric });
    }

    getAttendanceLogs(startDate: string, endDate: string): Observable<StaffAttendance[]> {
        return this.http.get<StaffAttendance[]>(`${this.apiUrl}/attendance?start_date=${startDate}&end_date=${endDate}`);
    }

    getStaffAttendanceLogs(staffId: string, startDate: string, endDate: string): Observable<StaffAttendance[]> {
        return this.http.get<StaffAttendance[]>(`${this.apiUrl}/attendance/${staffId}?start_date=${startDate}&end_date=${endDate}`);
    }
}
