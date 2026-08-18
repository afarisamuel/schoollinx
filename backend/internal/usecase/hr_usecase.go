package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

type hrUseCase struct {
	repo domain.HRRepository
	pdf  *pdf.PDFService
}

func NewHRUseCase(repo domain.HRRepository, pdfService *pdf.PDFService) domain.HRUseCase {
	return &hrUseCase{repo: repo, pdf: pdfService}
}

// Staff
func (u *hrUseCase) CreateStaffProfile(ctx context.Context, req *domain.StaffProfile) error {
	if err := u.repo.CreateStaff(ctx, req); err != nil {
		return err
	}
	// Auto-initialize onboarding checklist for every new hire
	return u.InitializeOnboarding(ctx, req.ID)
}

func (u *hrUseCase) GetStaffProfiles(ctx context.Context) ([]domain.StaffProfile, error) {
	return u.repo.GetAllStaff(ctx)
}

func (u *hrUseCase) UpdateStaffProfile(ctx context.Context, id uuid.UUID, req *domain.StaffProfile) error {
	req.ID = id
	return u.repo.UpdateStaff(ctx, req)
}

func (u *hrUseCase) DeleteStaffProfile(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteStaff(ctx, id)
}

// Payroll
func (u *hrUseCase) GenerateMonthlyPayroll(ctx context.Context, month, year int) ([]domain.PayrollRecord, error) {
	staffList, err := u.repo.GetAllStaff(ctx)
	if err != nil {
		return nil, err
	}

	// Fetch active deduction types for dynamic calculation
	deductionTypes, err := u.repo.GetActiveDeductionTypes(ctx)
	if err != nil {
		return nil, err
	}

	allowanceTypes, err := u.repo.GetActiveAllowanceTypes(ctx)
	if err != nil {
		return nil, err
	}

	taxBrackets, err := u.repo.GetActiveTaxBrackets(ctx)
	if err != nil {
		return nil, err
	}

	var generated []domain.PayrollRecord

	for _, staff := range staffList {
		allowancesBreakdown := make(map[string]float64)
		deductionsBreakdown := make(map[string]float64)

		totalAllowances := 0.0
		for _, at := range allowanceTypes {
			amt := 0.0
			if at.RateType == "PERCENTAGE" {
				amt = staff.BaseSalary * (at.Rate / 100.0)
			} else {
				amt = at.Rate
			}
			totalAllowances += amt
			allowancesBreakdown[at.Name] = amt
		}

		totalDeductions := 0.0
		for _, dt := range deductionTypes {
			amt := 0.0
			if dt.RateType == "PERCENTAGE" {
				amt = staff.BaseSalary * (dt.Rate / 100.0)
			} else { // FIXED
				amt = dt.Rate
			}
			totalDeductions += amt
			deductionsBreakdown[dt.Name] = amt
		}

		taxableIncome := staff.BaseSalary + totalAllowances - totalDeductions
		totalTax := 0.0
		if taxableIncome > 0 && len(taxBrackets) > 0 {
			for _, tb := range taxBrackets {
				if taxableIncome <= tb.MinIncome {
					continue
				}
				taxableAmountInBracket := taxableIncome - tb.MinIncome
				if tb.MaxIncome != nil && taxableIncome > *tb.MaxIncome {
					taxableAmountInBracket = *tb.MaxIncome - tb.MinIncome
				}
				tax := taxableAmountInBracket * (tb.Rate / 100.0)
				totalTax += tax
			}
		}

		if totalTax > 0 {
			totalDeductions += totalTax
			deductionsBreakdown["Income Tax"] = totalTax
		}

		netPay := staff.BaseSalary + totalAllowances - totalDeductions
		if netPay < 0 {
			netPay = 0
		}

		allowancesJSON, _ := json.Marshal(allowancesBreakdown)
		deductionsJSON, _ := json.Marshal(deductionsBreakdown)

		payroll := &domain.PayrollRecord{
			StaffID:             staff.ID,
			PeriodMonth:         month,
			PeriodYear:          year,
			GrossPay:            staff.BaseSalary,
			Allowances:          totalAllowances,
			Deductions:          totalDeductions,
			NetPay:              netPay,
			AllowancesBreakdown: string(allowancesJSON),
			DeductionsBreakdown: string(deductionsJSON),
			Status:              domain.PayrollPending,
		}

		if err := u.repo.CreatePayroll(ctx, payroll); err != nil {
			continue
		}

		generated = append(generated, *payroll)
	}

	return generated, nil
}

func (u *hrUseCase) GetPayrollHistory(ctx context.Context, month, year int) ([]domain.PayrollRecord, error) {
	return u.repo.GetPayrollByPeriod(ctx, month, year)
}

func (u *hrUseCase) MarkPayrollPaid(ctx context.Context, payrollID uuid.UUID) error {
	return u.repo.UpdatePayrollStatus(ctx, payrollID, domain.PayrollPaid)
}

func (u *hrUseCase) GeneratePayslip(ctx context.Context, payrollID uuid.UUID) (*domain.PayrollRecord, []byte, error) {
	// 1. Get the payroll record
	pr, err := u.repo.GetPayrollRecordByID(ctx, payrollID)
	if err != nil {
		return nil, nil, fmt.Errorf("payroll record not found: %w", err)
	}
	
	if pr.Status != domain.PayrollPaid {
		return nil, nil, fmt.Errorf("payslip can only be generated for paid payrolls")
	}

	// 2. Generate PDF
	var buf bytes.Buffer
	if err := u.pdf.GeneratePayslip(&buf, pr); err != nil {
		return nil, nil, err
	}

	return pr, buf.Bytes(), nil
}

// Leave
func (u *hrUseCase) SubmitLeaveRequest(ctx context.Context, req *domain.LeaveRequest) error {
	req.Status = domain.LeavePending
	return u.repo.CreateLeave(ctx, req)
}

func (u *hrUseCase) GetLeaveRequests(ctx context.Context) ([]domain.LeaveRequest, error) {
	return u.repo.GetAllLeaves(ctx)
}

func (u *hrUseCase) ApproveRejectLeave(ctx context.Context, leaveID uuid.UUID, status domain.LeaveStatus) error {
	// If leave is approved, deduct from leave balance
	if status == domain.LeaveApproved {
		leave, err := u.repo.GetLeaveByID(ctx, leaveID)
		if err == nil && leave.Status == domain.LeavePending {
			// Calculate days (simple difference)
			days := leave.EndDate.Sub(leave.StartDate).Hours() / 24.0
			if days < 1 {
				days = 1
			}

			year := leave.StartDate.Year()
			balance, err := u.repo.GetLeaveBalance(ctx, leave.StaffID, leave.LeaveType, year)
			if err == nil {
				balance.UsedDays += days
				u.repo.UpdateLeaveBalance(ctx, balance)
			}
		}
	}
	return u.repo.UpdateLeaveStatus(ctx, leaveID, status)
}

// Leave Balances
func (u *hrUseCase) AllocateLeaveBalance(ctx context.Context, lb *domain.LeaveBalance) error {
	return u.repo.CreateLeaveBalance(ctx, lb)
}

func (u *hrUseCase) GetStaffLeaveBalances(ctx context.Context, staffID uuid.UUID, year int) ([]domain.LeaveBalance, error) {
	return u.repo.GetLeaveBalancesByStaff(ctx, staffID, year)
}

func (u *hrUseCase) GetAllLeaveBalances(ctx context.Context, year int) ([]domain.LeaveBalance, error) {
	return u.repo.GetAllLeaveBalances(ctx, year)
}

// Deduction Types
func (u *hrUseCase) CreateDeductionType(ctx context.Context, dt *domain.DeductionType) error {
	return u.repo.CreateDeductionType(ctx, dt)
}

func (u *hrUseCase) GetDeductionTypes(ctx context.Context) ([]domain.DeductionType, error) {
	return u.repo.GetAllDeductionTypes(ctx)
}

func (u *hrUseCase) UpdateDeductionType(ctx context.Context, id uuid.UUID, dt *domain.DeductionType) error {
	dt.ID = id
	return u.repo.UpdateDeductionType(ctx, dt)
}

func (u *hrUseCase) DeleteDeductionType(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteDeductionType(ctx, id)
}

// Allowance Types
func (u *hrUseCase) CreateAllowanceType(ctx context.Context, at *domain.AllowanceType) error {
	return u.repo.CreateAllowanceType(ctx, at)
}

func (u *hrUseCase) GetAllowanceTypes(ctx context.Context) ([]domain.AllowanceType, error) {
	return u.repo.GetAllAllowanceTypes(ctx)
}

func (u *hrUseCase) UpdateAllowanceType(ctx context.Context, id uuid.UUID, at *domain.AllowanceType) error {
	at.ID = id
	return u.repo.UpdateAllowanceType(ctx, at)
}

func (u *hrUseCase) DeleteAllowanceType(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteAllowanceType(ctx, id)
}

// Tax Brackets
func (u *hrUseCase) CreateTaxBracket(ctx context.Context, tb *domain.TaxBracket) error {
	return u.repo.CreateTaxBracket(ctx, tb)
}

func (u *hrUseCase) GetTaxBrackets(ctx context.Context) ([]domain.TaxBracket, error) {
	return u.repo.GetAllTaxBrackets(ctx)
}

func (u *hrUseCase) UpdateTaxBracket(ctx context.Context, id uuid.UUID, tb *domain.TaxBracket) error {
	tb.ID = id
	return u.repo.UpdateTaxBracket(ctx, tb)
}

func (u *hrUseCase) DeleteTaxBracket(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteTaxBracket(ctx, id)
}

// Performance Reviews
func (u *hrUseCase) SubmitPerformanceReview(ctx context.Context, review *domain.PerformanceReview) error {
	return u.repo.CreatePerformanceReview(ctx, review)
}

func (u *hrUseCase) GetStaffPerformanceReviews(ctx context.Context, staffID uuid.UUID) ([]domain.PerformanceReview, error) {
	return u.repo.GetPerformanceReviewsByStaff(ctx, staffID)
}

func (u *hrUseCase) GetAllPerformanceReviews(ctx context.Context) ([]domain.PerformanceReview, error) {
	return u.repo.GetAllPerformanceReviews(ctx)
}

func (u *hrUseCase) UpdatePerformanceReview(ctx context.Context, id uuid.UUID, review *domain.PerformanceReview) error {
	existing, err := u.repo.GetAllPerformanceReviews(ctx)
	if err != nil {
		return err
	}
	var current *domain.PerformanceReview
	for i := range existing {
		if existing[i].ID == id {
			current = &existing[i]
			break
		}
	}
	if current == nil {
		return fmt.Errorf("performance review not found")
	}

	// State machine: enforce valid transitions
	// DRAFT → EMPLOYEE_REVIEW → COMPLETED only
	switch current.Status {
	case domain.ReviewDraft:
		if review.Status == domain.ReviewCompleted {
			return fmt.Errorf("cannot complete review without employee sign-off; transition to EMPLOYEE_REVIEW first")
		}
	case domain.ReviewEmployeeReview:
		// Employee signs off: capture comments and timestamp
		if review.Status == domain.ReviewCompleted {
			now := time.Now()
			review.EmployeeSignedAt = &now
		}
	case domain.ReviewCompleted:
		return fmt.Errorf("review is already completed and cannot be changed")
	}

	review.ID = id
	return u.repo.UpdatePerformanceReview(ctx, review)
}

// Professional Development
func (u *hrUseCase) LogProfessionalDevelopment(ctx context.Context, pd *domain.ProfessionalDevelopment) error {
	return u.repo.CreateProfessionalDevelopment(ctx, pd)
}

func (u *hrUseCase) GetStaffProfessionalDevelopment(ctx context.Context, staffID uuid.UUID) ([]domain.ProfessionalDevelopment, error) {
	return u.repo.GetProfessionalDevelopmentByStaff(ctx, staffID)
}

// Staff Attendance
func (u *hrUseCase) ClockIn(ctx context.Context, staffID uuid.UUID, isBiometric bool) (*domain.StaffAttendance, error) {
	now := time.Now()
	// Get or create today's record
	record, err := u.repo.GetAttendanceByStaffAndDate(ctx, staffID, now)
	if err != nil {
		// Does not exist, create new
		record = &domain.StaffAttendance{
			StaffID:     staffID,
			Date:        time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()),
			ClockIn:     &now,
			Status:      domain.AttendancePresent, // Base status, can be LATE logic later
			IsBiometric: isBiometric,
		}
		if err := u.repo.LogAttendance(ctx, record); err != nil {
			return nil, err
		}
		return record, nil
	}

	// If already exists and clocked in, just return
	if record.ClockIn != nil {
		return record, fmt.Errorf("already clocked in today")
	}

	record.ClockIn = &now
	record.Status = domain.AttendancePresent
	record.IsBiometric = isBiometric
	if err := u.repo.LogAttendance(ctx, record); err != nil {
		return nil, err
	}
	return record, nil
}

func (u *hrUseCase) ClockOut(ctx context.Context, staffID uuid.UUID, isBiometric bool) (*domain.StaffAttendance, error) {
	now := time.Now()
	record, err := u.repo.GetAttendanceByStaffAndDate(ctx, staffID, now)
	if err != nil {
		return nil, fmt.Errorf("no clock-in record found for today")
	}

	if record.ClockOut != nil {
		return record, fmt.Errorf("already clocked out today")
	}

	record.ClockOut = &now
	// if they clock out, their status is still present (or whatever it was).
	if err := u.repo.LogAttendance(ctx, record); err != nil {
		return nil, err
	}
	return record, nil
}

func (u *hrUseCase) GetAttendanceLogs(ctx context.Context, startDate, endDate string) ([]domain.StaffAttendance, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start date format, expected YYYY-MM-DD")
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end date format, expected YYYY-MM-DD")
	}

	return u.repo.GetAttendanceByPeriod(ctx, start, end)
}

func (u *hrUseCase) GetStaffAttendanceLogs(ctx context.Context, staffID uuid.UUID, startDate, endDate string) ([]domain.StaffAttendance, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start date format, expected YYYY-MM-DD")
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end date format, expected YYYY-MM-DD")
	}

	return u.repo.GetStaffAttendanceByPeriod(ctx, staffID, start, end)
}

// --- Onboarding ---

func (u *hrUseCase) InitializeOnboarding(ctx context.Context, staffID uuid.UUID) error {
	checklist := &domain.OnboardingChecklist{
		StaffID: staffID,
		Status:  domain.OnboardingPending,
	}
	return u.repo.CreateOnboardingChecklist(ctx, checklist)
}

func (u *hrUseCase) GetOnboardingChecklist(ctx context.Context, staffID uuid.UUID) (*domain.OnboardingChecklist, error) {
	return u.repo.GetChecklistByStaff(ctx, staffID)
}

func (u *hrUseCase) UpdateOnboardingStatus(ctx context.Context, staffID uuid.UUID, checklistData *domain.OnboardingChecklist) error {
	checklist, err := u.repo.GetChecklistByStaff(ctx, staffID)
	if err != nil {
		return err
	}

	checklist.ContractSigned = checklistData.ContractSigned
	checklist.IDProvided = checklistData.IDProvided
	checklist.BankDetailsVerified = checklistData.BankDetailsVerified
	checklist.EquipmentAssigned = checklistData.EquipmentAssigned
	checklist.OrientationCompleted = checklistData.OrientationCompleted

	if checklist.ContractSigned && checklist.IDProvided && checklist.BankDetailsVerified && checklist.EquipmentAssigned && checklist.OrientationCompleted {
		checklist.Status = domain.OnboardingCompleted
	} else {
		checklist.Status = domain.OnboardingPending
	}

	return u.repo.UpdateChecklist(ctx, checklist)
}
