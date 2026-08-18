package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type hrRepository struct {
	db *gorm.DB
}

func NewHRRepository(db *gorm.DB) domain.HRRepository {
	return &hrRepository{db: db}
}

// Staff
func (r *hrRepository) CreateStaff(ctx context.Context, staff *domain.StaffProfile) error {
	return r.db.WithContext(ctx).Create(staff).Error
}

func (r *hrRepository) GetStaffByID(ctx context.Context, id uuid.UUID) (*domain.StaffProfile, error) {
	var staff domain.StaffProfile
	if err := r.db.WithContext(ctx).Preload("User").First(&staff, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &staff, nil
}

func (r *hrRepository) GetAllStaff(ctx context.Context) ([]domain.StaffProfile, error) {
	var staff []domain.StaffProfile
	err := r.db.WithContext(ctx).Preload("User").Find(&staff).Error
	return staff, err
}

func (r *hrRepository) UpdateStaff(ctx context.Context, staff *domain.StaffProfile) error {
	return r.db.WithContext(ctx).Save(staff).Error
}

func (r *hrRepository) DeleteStaff(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.StaffProfile{}, "id = ?", id).Error
}

// Payroll
func (r *hrRepository) CreatePayroll(ctx context.Context, payroll *domain.PayrollRecord) error {
	return r.db.WithContext(ctx).Create(payroll).Error
}

func (r *hrRepository) GetPayrollByPeriod(ctx context.Context, month, year int) ([]domain.PayrollRecord, error) {
	var records []domain.PayrollRecord
	err := r.db.WithContext(ctx).Preload("Staff").Preload("Staff.User").
		Where("period_month = ? AND period_year = ?", month, year).
		Find(&records).Error
	return records, err
}

func (r *hrRepository) GetPayrollByStaff(ctx context.Context, staffID uuid.UUID) ([]domain.PayrollRecord, error) {
	var payroll []domain.PayrollRecord
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("period_year desc, period_month desc").Find(&payroll).Error
	return payroll, err
}

func (r *hrRepository) GetPayrollRecordByID(ctx context.Context, id uuid.UUID) (*domain.PayrollRecord, error) {
	var pr domain.PayrollRecord
	err := r.db.WithContext(ctx).Preload("Staff").Preload("Staff.User").Where("id = ?", id).First(&pr).Error
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (r *hrRepository) UpdatePayrollStatus(ctx context.Context, id uuid.UUID, status domain.PayrollStatus) error {
	return r.db.WithContext(ctx).Model(&domain.PayrollRecord{}).
		Where("id = ?", id).Update("status", status).Error
}

// Leave
func (r *hrRepository) CreateLeave(ctx context.Context, leave *domain.LeaveRequest) error {
	return r.db.WithContext(ctx).Create(leave).Error
}

func (r *hrRepository) GetLeaveByID(ctx context.Context, id uuid.UUID) (*domain.LeaveRequest, error) {
	var leave domain.LeaveRequest
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&leave).Error
	if err != nil {
		return nil, err
	}
	return &leave, nil
}

func (r *hrRepository) GetAllLeaves(ctx context.Context) ([]domain.LeaveRequest, error) {
	var leaves []domain.LeaveRequest
	err := r.db.WithContext(ctx).Preload("Staff").Preload("Staff.User").Find(&leaves).Error
	return leaves, err
}

func (r *hrRepository) UpdateLeaveStatus(ctx context.Context, id uuid.UUID, status domain.LeaveStatus) error {
	return r.db.WithContext(ctx).Model(&domain.LeaveRequest{}).
		Where("id = ?", id).Update("status", status).Error
}

// Leave Balances
func (r *hrRepository) CreateLeaveBalance(ctx context.Context, lb *domain.LeaveBalance) error {
	return r.db.WithContext(ctx).Create(lb).Error
}

func (r *hrRepository) GetLeaveBalancesByStaff(ctx context.Context, staffID uuid.UUID, year int) ([]domain.LeaveBalance, error) {
	var balances []domain.LeaveBalance
	err := r.db.WithContext(ctx).Where("staff_id = ? AND year = ?", staffID, year).Order("leave_type ASC").Find(&balances).Error
	return balances, err
}

func (r *hrRepository) GetAllLeaveBalances(ctx context.Context, year int) ([]domain.LeaveBalance, error) {
	var balances []domain.LeaveBalance
	err := r.db.WithContext(ctx).Preload("Staff").Where("year = ?", year).Order("leave_type ASC").Find(&balances).Error
	return balances, err
}

func (r *hrRepository) GetLeaveBalance(ctx context.Context, staffID uuid.UUID, leaveType string, year int) (*domain.LeaveBalance, error) {
	var balance domain.LeaveBalance
	err := r.db.WithContext(ctx).Where("staff_id = ? AND leave_type = ? AND year = ?", staffID, leaveType, year).First(&balance).Error
	if err != nil {
		return nil, err
	}
	return &balance, nil
}

func (r *hrRepository) UpdateLeaveBalance(ctx context.Context, lb *domain.LeaveBalance) error {
	return r.db.WithContext(ctx).Save(lb).Error
}

// Deduction Types
func (r *hrRepository) CreateDeductionType(ctx context.Context, dt *domain.DeductionType) error {
	return r.db.WithContext(ctx).Create(dt).Error
}

func (r *hrRepository) GetAllDeductionTypes(ctx context.Context) ([]domain.DeductionType, error) {
	var types []domain.DeductionType
	err := r.db.WithContext(ctx).Order("name ASC").Find(&types).Error
	return types, err
}

func (r *hrRepository) GetActiveDeductionTypes(ctx context.Context) ([]domain.DeductionType, error) {
	var types []domain.DeductionType
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("name ASC").Find(&types).Error
	return types, err
}

func (r *hrRepository) UpdateDeductionType(ctx context.Context, dt *domain.DeductionType) error {
	return r.db.WithContext(ctx).Save(dt).Error
}

func (r *hrRepository) DeleteDeductionType(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.DeductionType{}, "id = ?", id).Error
}

// Allowance Types
func (r *hrRepository) CreateAllowanceType(ctx context.Context, at *domain.AllowanceType) error {
	return r.db.WithContext(ctx).Create(at).Error
}

func (r *hrRepository) GetAllAllowanceTypes(ctx context.Context) ([]domain.AllowanceType, error) {
	var types []domain.AllowanceType
	err := r.db.WithContext(ctx).Order("name ASC").Find(&types).Error
	return types, err
}

func (r *hrRepository) GetActiveAllowanceTypes(ctx context.Context) ([]domain.AllowanceType, error) {
	var types []domain.AllowanceType
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("name ASC").Find(&types).Error
	return types, err
}

func (r *hrRepository) UpdateAllowanceType(ctx context.Context, at *domain.AllowanceType) error {
	return r.db.WithContext(ctx).Save(at).Error
}

func (r *hrRepository) DeleteAllowanceType(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.AllowanceType{}, "id = ?", id).Error
}

// Tax Brackets
func (r *hrRepository) CreateTaxBracket(ctx context.Context, tb *domain.TaxBracket) error {
	return r.db.WithContext(ctx).Create(tb).Error
}

func (r *hrRepository) GetAllTaxBrackets(ctx context.Context) ([]domain.TaxBracket, error) {
	var brackets []domain.TaxBracket
	err := r.db.WithContext(ctx).Order("min_income ASC").Find(&brackets).Error
	return brackets, err
}

func (r *hrRepository) GetActiveTaxBrackets(ctx context.Context) ([]domain.TaxBracket, error) {
	var brackets []domain.TaxBracket
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("min_income ASC").Find(&brackets).Error
	return brackets, err
}

func (r *hrRepository) UpdateTaxBracket(ctx context.Context, tb *domain.TaxBracket) error {
	return r.db.WithContext(ctx).Save(tb).Error
}

func (r *hrRepository) DeleteTaxBracket(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.TaxBracket{}, "id = ?", id).Error
}

// Performance & Development
func (r *hrRepository) CreatePerformanceReview(ctx context.Context, review *domain.PerformanceReview) error {
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *hrRepository) GetPerformanceReviewsByStaff(ctx context.Context, staffID uuid.UUID) ([]domain.PerformanceReview, error) {
	var reviews []domain.PerformanceReview
	err := r.db.WithContext(ctx).Preload("Staff").Where("staff_id = ?", staffID).Order("review_date desc").Find(&reviews).Error
	return reviews, err
}

func (r *hrRepository) GetAllPerformanceReviews(ctx context.Context) ([]domain.PerformanceReview, error) {
	var reviews []domain.PerformanceReview
	err := r.db.WithContext(ctx).Preload("Staff").Order("review_date desc").Find(&reviews).Error
	return reviews, err
}

func (r *hrRepository) UpdatePerformanceReview(ctx context.Context, review *domain.PerformanceReview) error {
	return r.db.WithContext(ctx).Save(review).Error
}

func (r *hrRepository) CreateProfessionalDevelopment(ctx context.Context, pd *domain.ProfessionalDevelopment) error {
	return r.db.WithContext(ctx).Create(pd).Error
}

func (r *hrRepository) GetProfessionalDevelopmentByStaff(ctx context.Context, staffID uuid.UUID) ([]domain.ProfessionalDevelopment, error) {
	var pds []domain.ProfessionalDevelopment
	err := r.db.WithContext(ctx).Where("staff_id = ?", staffID).Order("created_at desc").Find(&pds).Error
	return pds, err
}

// Staff Attendance
func (r *hrRepository) LogAttendance(ctx context.Context, attendance *domain.StaffAttendance) error {
	return r.db.WithContext(ctx).Save(attendance).Error
}

func (r *hrRepository) GetAttendanceByStaffAndDate(ctx context.Context, staffID uuid.UUID, date time.Time) (*domain.StaffAttendance, error) {
	var att domain.StaffAttendance
	// date is stored as time.Time, usually with 00:00:00 for the day. We can query by just the date portion.
	// For PostgreSQL, we can cast to date, but let's just use exact match since the struct uses gorm type:date.
	err := r.db.WithContext(ctx).Where("staff_id = ? AND date::date = ?", staffID, date.Format("2006-01-02")).First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *hrRepository) GetAttendanceByPeriod(ctx context.Context, startDate, endDate time.Time) ([]domain.StaffAttendance, error) {
	var logs []domain.StaffAttendance
	err := r.db.WithContext(ctx).Preload("Staff").Where("date >= ? AND date <= ?", startDate, endDate).Order("date desc").Find(&logs).Error
	return logs, err
}

func (r *hrRepository) GetStaffAttendanceByPeriod(ctx context.Context, staffID uuid.UUID, startDate, endDate time.Time) ([]domain.StaffAttendance, error) {
	var logs []domain.StaffAttendance
	err := r.db.WithContext(ctx).Where("staff_id = ? AND date >= ? AND date <= ?", staffID, startDate, endDate).Order("date desc").Find(&logs).Error
	return logs, err
}

// Onboarding
func (r *hrRepository) CreateOnboardingChecklist(ctx context.Context, checklist *domain.OnboardingChecklist) error {
	return r.db.WithContext(ctx).Create(checklist).Error
}

func (r *hrRepository) GetChecklistByStaff(ctx context.Context, staffID uuid.UUID) (*domain.OnboardingChecklist, error) {
	var checklist domain.OnboardingChecklist
	if err := r.db.WithContext(ctx).First(&checklist, "staff_id = ?", staffID).Error; err != nil {
		return nil, err
	}
	return &checklist, nil
}

func (r *hrRepository) UpdateChecklist(ctx context.Context, checklist *domain.OnboardingChecklist) error {
	return r.db.WithContext(ctx).Save(checklist).Error
}
