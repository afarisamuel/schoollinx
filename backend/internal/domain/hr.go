package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type LeaveStatus string

const (
	LeavePending  LeaveStatus = "PENDING"
	LeaveApproved LeaveStatus = "APPROVED"
	LeaveRejected LeaveStatus = "REJECTED"
)

type PayrollStatus string

const (
	PayrollPending PayrollStatus = "PENDING"
	PayrollPaid    PayrollStatus = "PAID"
)

type StaffProfile struct {
	TenantBase
	ID          uuid.UUID                  `json:"id" gorm:"type:uuid;primaryKey"`
	UserID      *uuid.UUID                 `json:"user_id,omitempty" gorm:"type:uuid;index"`
	User        *User                      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	FirstName   string                     `json:"first_name" gorm:"not null"`
	LastName    string                     `json:"last_name" gorm:"not null"`
	Email       encryption.EncryptedString `json:"email"`
	PhoneNumber encryption.EncryptedString `json:"phone_number"`
	JobTitle    string                     `json:"job_title" gorm:"not null"`
	Department  string                     `json:"department"`
	BaseSalary  float64                    `json:"base_salary" gorm:"not null"`
	BankAccount encryption.EncryptedString `json:"bank_account"`
	HireDate    time.Time                  `json:"hire_date" gorm:"not null"`
	CreatedAt   time.Time                  `json:"created_at"`
	UpdatedAt   time.Time                  `json:"updated_at"`
}

func (s *StaffProfile) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

const (
	AttendancePresent AttendanceStatus = "PRESENT"
	AttendanceLate    AttendanceStatus = "LATE"
	AttendanceAbsent  AttendanceStatus = "ABSENT"
)

// StaffAttendance tracks daily clock in/out for staff
type StaffAttendance struct {
	TenantBase
	ID          uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID     uuid.UUID        `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff       *StaffProfile    `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	Date        time.Time        `json:"date" gorm:"type:date;not null"`
	ClockIn     *time.Time       `json:"clock_in"`
	ClockOut    *time.Time       `json:"clock_out"`
	Status      AttendanceStatus `json:"status" gorm:"type:varchar(20);not null;default:'PRESENT'"`
	Notes       string           `json:"notes"`
	IsBiometric bool             `json:"is_biometric" gorm:"default:false"` // True if from hardware scanner
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

func (sa *StaffAttendance) BeforeCreate(tx *gorm.DB) (err error) {
	if sa.ID == uuid.Nil {
		sa.ID = uuid.New()
	}
	return
}

type PayrollRecord struct {
	TenantBase
	ID                  uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID             uuid.UUID     `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff               *StaffProfile `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	PeriodMonth         int           `json:"period_month" gorm:"not null"`
	PeriodYear          int           `json:"period_year" gorm:"not null"`
	GrossPay            float64       `json:"gross_pay" gorm:"not null"` // Base salary
	Allowances          float64       `json:"allowances" gorm:"default:0"`
	Deductions          float64       `json:"deductions" gorm:"default:0"`
	NetPay              float64       `json:"net_pay" gorm:"not null"`
	AllowancesBreakdown string        `json:"allowances_breakdown" gorm:"type:text"` // JSON encoded
	DeductionsBreakdown string        `json:"deductions_breakdown" gorm:"type:text"` // JSON encoded
	Status              PayrollStatus `json:"status" gorm:"type:varchar(20);not null;default:'PENDING'"`
	PaymentDate         *time.Time    `json:"payment_date"`
	CreatedAt           time.Time     `json:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at"`
}

func (p *PayrollRecord) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return
}

type LeaveRequest struct {
	TenantBase
	ID        uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID   uuid.UUID     `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff     *StaffProfile `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	LeaveType string        `json:"leave_type" gorm:"not null"` // e.g., Sick, PTO, Unpaid
	StartDate time.Time     `json:"start_date" gorm:"not null"`
	EndDate   time.Time     `json:"end_date" gorm:"not null"`
	Reason    string        `json:"reason"`
	Status    LeaveStatus   `json:"status" gorm:"type:varchar(20);not null;default:'PENDING'"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

func (l *LeaveRequest) BeforeCreate(tx *gorm.DB) (err error) {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return
}

// LeaveBalance tracks allocated vs used leave days per staff per leave type per year
type LeaveBalance struct {
	TenantBase
	ID            uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID       uuid.UUID     `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff         *StaffProfile `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	LeaveType     string        `json:"leave_type" gorm:"not null"` // Sick, Annual, Maternity, etc.
	Year          int           `json:"year" gorm:"not null"`
	AllocatedDays float64       `json:"allocated_days" gorm:"not null;default:0"`
	UsedDays      float64       `json:"used_days" gorm:"not null;default:0"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

func (lb *LeaveBalance) BeforeCreate(tx *gorm.DB) (err error) {
	if lb.ID == uuid.Nil {
		lb.ID = uuid.New()
	}
	return
}

func (lb *LeaveBalance) RemainingDays() float64 {
	return lb.AllocatedDays - lb.UsedDays
}

// DeductionType represents a configurable payroll deduction (e.g., Tax, SSNIT, Health Insurance)
type DeductionType struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	RateType    string    `json:"rate_type" gorm:"not null"` // "PERCENTAGE" or "FIXED"
	Rate        float64   `json:"rate" gorm:"not null"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (d *DeductionType) BeforeCreate(tx *gorm.DB) (err error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return
}

// AllowanceType represents a configurable payroll allowance (e.g., Transport, Housing)
type AllowanceType struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	RateType    string    `json:"rate_type" gorm:"not null"` // "PERCENTAGE" or "FIXED"
	Rate        float64   `json:"rate" gorm:"not null"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a *AllowanceType) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}

// TaxBracket defines a tier in the automated progressive tax engine
type TaxBracket struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	MinIncome float64   `json:"min_income" gorm:"not null"`
	MaxIncome *float64  `json:"max_income"`           // Nil means infinity
	Rate      float64   `json:"rate" gorm:"not null"` // Percentage
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (t *TaxBracket) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return
}

type HRRepository interface {
	OnboardingRepository
	// Staff
	CreateStaff(ctx context.Context, staff *StaffProfile) error
	GetStaffByID(ctx context.Context, id uuid.UUID) (*StaffProfile, error)
	GetAllStaff(ctx context.Context) ([]StaffProfile, error)
	UpdateStaff(ctx context.Context, staff *StaffProfile) error
	DeleteStaff(ctx context.Context, id uuid.UUID) error

	// Payroll
	CreatePayroll(ctx context.Context, payroll *PayrollRecord) error
	GetPayrollByPeriod(ctx context.Context, month, year int) ([]PayrollRecord, error)
	GetPayrollByStaff(ctx context.Context, staffID uuid.UUID) ([]PayrollRecord, error)
	GetPayrollRecordByID(ctx context.Context, id uuid.UUID) (*PayrollRecord, error)
	UpdatePayrollStatus(ctx context.Context, id uuid.UUID, status PayrollStatus) error

	// Leave
	CreateLeave(ctx context.Context, leave *LeaveRequest) error
	GetLeaveByID(ctx context.Context, id uuid.UUID) (*LeaveRequest, error)
	GetAllLeaves(ctx context.Context) ([]LeaveRequest, error)
	UpdateLeaveStatus(ctx context.Context, id uuid.UUID, status LeaveStatus) error

	// Leave Balances
	CreateLeaveBalance(ctx context.Context, lb *LeaveBalance) error
	GetLeaveBalancesByStaff(ctx context.Context, staffID uuid.UUID, year int) ([]LeaveBalance, error)
	GetAllLeaveBalances(ctx context.Context, year int) ([]LeaveBalance, error)
	GetLeaveBalance(ctx context.Context, staffID uuid.UUID, leaveType string, year int) (*LeaveBalance, error)
	UpdateLeaveBalance(ctx context.Context, lb *LeaveBalance) error

	// Deduction Types
	CreateDeductionType(ctx context.Context, dt *DeductionType) error
	GetAllDeductionTypes(ctx context.Context) ([]DeductionType, error)
	GetActiveDeductionTypes(ctx context.Context) ([]DeductionType, error)
	UpdateDeductionType(ctx context.Context, dt *DeductionType) error
	DeleteDeductionType(ctx context.Context, id uuid.UUID) error

	// Allowance Types
	CreateAllowanceType(ctx context.Context, at *AllowanceType) error
	GetAllAllowanceTypes(ctx context.Context) ([]AllowanceType, error)
	GetActiveAllowanceTypes(ctx context.Context) ([]AllowanceType, error)
	UpdateAllowanceType(ctx context.Context, at *AllowanceType) error
	DeleteAllowanceType(ctx context.Context, id uuid.UUID) error

	// Tax Brackets
	CreateTaxBracket(ctx context.Context, tb *TaxBracket) error
	GetAllTaxBrackets(ctx context.Context) ([]TaxBracket, error)
	GetActiveTaxBrackets(ctx context.Context) ([]TaxBracket, error)
	UpdateTaxBracket(ctx context.Context, tb *TaxBracket) error
	DeleteTaxBracket(ctx context.Context, id uuid.UUID) error

	// Performance & Development
	CreatePerformanceReview(ctx context.Context, review *PerformanceReview) error
	GetPerformanceReviewsByStaff(ctx context.Context, staffID uuid.UUID) ([]PerformanceReview, error)
	GetAllPerformanceReviews(ctx context.Context) ([]PerformanceReview, error)
	UpdatePerformanceReview(ctx context.Context, review *PerformanceReview) error
	CreateProfessionalDevelopment(ctx context.Context, pd *ProfessionalDevelopment) error
	GetProfessionalDevelopmentByStaff(ctx context.Context, staffID uuid.UUID) ([]ProfessionalDevelopment, error)

	// Staff Attendance
	LogAttendance(ctx context.Context, attendance *StaffAttendance) error
	GetAttendanceByStaffAndDate(ctx context.Context, staffID uuid.UUID, date time.Time) (*StaffAttendance, error)
	GetAttendanceByPeriod(ctx context.Context, startDate, endDate time.Time) ([]StaffAttendance, error)
	GetStaffAttendanceByPeriod(ctx context.Context, staffID uuid.UUID, startDate, endDate time.Time) ([]StaffAttendance, error)
}

type HRUseCase interface {
	CreateStaffProfile(ctx context.Context, req *StaffProfile) error
	GetStaffProfiles(ctx context.Context) ([]StaffProfile, error)
	UpdateStaffProfile(ctx context.Context, id uuid.UUID, req *StaffProfile) error
	DeleteStaffProfile(ctx context.Context, id uuid.UUID) error

	// Onboarding
	InitializeOnboarding(ctx context.Context, staffID uuid.UUID) error
	GetOnboardingChecklist(ctx context.Context, staffID uuid.UUID) (*OnboardingChecklist, error)
	UpdateOnboardingStatus(ctx context.Context, staffID uuid.UUID, checklistData *OnboardingChecklist) error

	GenerateMonthlyPayroll(ctx context.Context, month, year int) ([]PayrollRecord, error)
	GetPayrollHistory(ctx context.Context, month, year int) ([]PayrollRecord, error)
	MarkPayrollPaid(ctx context.Context, payrollID uuid.UUID) error
	GeneratePayslip(ctx context.Context, payrollID uuid.UUID) (*PayrollRecord, []byte, error)

	SubmitLeaveRequest(ctx context.Context, req *LeaveRequest) error
	GetLeaveRequests(ctx context.Context) ([]LeaveRequest, error)
	ApproveRejectLeave(ctx context.Context, leaveID uuid.UUID, status LeaveStatus) error

	// Leave Balances
	AllocateLeaveBalance(ctx context.Context, lb *LeaveBalance) error
	GetStaffLeaveBalances(ctx context.Context, staffID uuid.UUID, year int) ([]LeaveBalance, error)
	GetAllLeaveBalances(ctx context.Context, year int) ([]LeaveBalance, error)

	// Deduction Types
	CreateDeductionType(ctx context.Context, dt *DeductionType) error
	GetDeductionTypes(ctx context.Context) ([]DeductionType, error)
	UpdateDeductionType(ctx context.Context, id uuid.UUID, dt *DeductionType) error
	DeleteDeductionType(ctx context.Context, id uuid.UUID) error

	// Allowance Types
	CreateAllowanceType(ctx context.Context, at *AllowanceType) error
	GetAllowanceTypes(ctx context.Context) ([]AllowanceType, error)
	UpdateAllowanceType(ctx context.Context, id uuid.UUID, at *AllowanceType) error
	DeleteAllowanceType(ctx context.Context, id uuid.UUID) error

	// Tax Brackets
	CreateTaxBracket(ctx context.Context, tb *TaxBracket) error
	GetTaxBrackets(ctx context.Context) ([]TaxBracket, error)
	UpdateTaxBracket(ctx context.Context, id uuid.UUID, tb *TaxBracket) error
	DeleteTaxBracket(ctx context.Context, id uuid.UUID) error

	// Performance & Development
	SubmitPerformanceReview(ctx context.Context, review *PerformanceReview) error
	GetStaffPerformanceReviews(ctx context.Context, staffID uuid.UUID) ([]PerformanceReview, error)
	GetAllPerformanceReviews(ctx context.Context) ([]PerformanceReview, error)
	UpdatePerformanceReview(ctx context.Context, id uuid.UUID, review *PerformanceReview) error
	LogProfessionalDevelopment(ctx context.Context, pd *ProfessionalDevelopment) error
	GetStaffProfessionalDevelopment(ctx context.Context, staffID uuid.UUID) ([]ProfessionalDevelopment, error)

	// Staff Attendance
	ClockIn(ctx context.Context, staffID uuid.UUID, isBiometric bool) (*StaffAttendance, error)
	ClockOut(ctx context.Context, staffID uuid.UUID, isBiometric bool) (*StaffAttendance, error)
	GetAttendanceLogs(ctx context.Context, startDate, endDate string) ([]StaffAttendance, error)
	GetStaffAttendanceLogs(ctx context.Context, staffID uuid.UUID, startDate, endDate string) ([]StaffAttendance, error)
}
