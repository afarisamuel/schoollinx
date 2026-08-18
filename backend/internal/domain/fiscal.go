package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FeeCategory string

const (
	CategoryTermFee         FeeCategory = "TERM_FEE"
	CategoryTuition         FeeCategory = "TUITION"
	CategoryLab             FeeCategory = "LAB"
	CategoryLibraryFine     FeeCategory = "LIBRARY_FINE"
	CategoryExtracurricular FeeCategory = "EXTRACURRICULAR"
	CategoryCanteen         FeeCategory = "CANTEEN"
	CategoryTransport       FeeCategory = "TRANSPORT"
)

// FeeFrequency defines how often a fee is billed.
// Common presets are provided but any custom string is accepted.
type FeeFrequency string

const (
	FrequencyDaily    FeeFrequency = "DAILY"
	FrequencyWeekly   FeeFrequency = "WEEKLY"
	FrequencyMonthly  FeeFrequency = "MONTHLY"
	FrequencyTermly   FeeFrequency = "TERMLY"
	FrequencyAnnually FeeFrequency = "ANNUALLY"
)

type FeeStructure struct {
	TenantBase
	ID               uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey"`
	AcademicPeriodID uuid.UUID       `json:"academic_period_id" gorm:"type:uuid;not null;uniqueIndex:idx_period_category"`
	AcademicPeriod   *AcademicPeriod `json:"academic_period,omitempty" gorm:"foreignKey:AcademicPeriodID"`
	Category         FeeCategory     `json:"category" gorm:"not null;uniqueIndex:idx_period_category"`
	Amount           float64         `json:"amount" gorm:"not null"`
	Frequency        FeeFrequency    `json:"frequency" gorm:"type:varchar(50);default:'TERMLY';not null"`
	IsTermFee        *bool           `json:"is_term_fee" gorm:"default:true;not null"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

func (fs *FeeStructure) BeforeCreate(tx *gorm.DB) (err error) {
	if fs.ID == uuid.Nil {
		fs.ID = uuid.New()
	}
	return
}

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "PENDING"
	PaymentStatusPaid    PaymentStatus = "PAID"
	PaymentStatusOverdue PaymentStatus = "OVERDUE"
)

type FeeBreakdownItem struct {
	Category FeeCategory `json:"category"`
	Amount   float64     `json:"amount"`
}

type FiscalRecord struct {
	TenantBase
	ID          uuid.UUID            `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID   uuid.UUID            `json:"student_id" gorm:"type:uuid;not null"`
	Student     *Student             `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	Category    FeeCategory          `json:"category" gorm:"not null"`
	Amount      float64              `json:"amount" gorm:"not null"`
	AmountPaid  float64              `json:"amount_paid" gorm:"default:0"`
	BalanceDue  float64              `json:"balance_due" gorm:"->;type:decimal(12,2)"`
	Description string               `json:"description"`
	TermName    string               `json:"term_name" gorm:"type:varchar(100)"` // Active term at time of generation
	Breakdown   []FeeBreakdownItem   `json:"breakdown" gorm:"serializer:json"`   // JSON breakdown of included fees
	Status      PaymentStatus        `json:"status" gorm:"default:PENDING"`
	DueDate     time.Time            `json:"due_date"`
	PaidAt      *time.Time           `json:"paid_at,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

type FiscalSummary struct {
	TenantBase
	TotalReceivables float64 `json:"total_receivables"`
	TotalOverdue     float64 `json:"total_overdue"`
	CollectionsMTD   float64 `json:"collections_mtd"`
}

func (f *FiscalRecord) BeforeCreate(tx *gorm.DB) (err error) {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return
}

// WalletTransactionType represents the direction of a wallet transaction
type WalletTransactionType string

const (
	WalletTransactionCredit WalletTransactionType = "CREDIT" // Top-up / deposit
	WalletTransactionDebit  WalletTransactionType = "DEBIT"  // Fee deduction
)

// WalletTransaction is an audit trail for every wallet top-up and deduction
type WalletTransaction struct {
	TenantBase
	ID          uuid.UUID             `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID   uuid.UUID             `json:"student_id" gorm:"type:uuid;not null;index"`
	Student     *Student              `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	Type        WalletTransactionType `json:"type" gorm:"type:varchar(10);not null"`
	Amount      float64               `json:"amount" gorm:"not null"`
	Balance     float64               `json:"balance" gorm:"not null"` // Balance after this transaction
	Description string                `json:"description"`
	CreatedAt   time.Time             `json:"created_at"`
}

func (wt *WalletTransaction) BeforeCreate(tx *gorm.DB) (err error) {
	if wt.ID == uuid.Nil {
		wt.ID = uuid.New()
	}
	return
}

type FiscalRepository interface {
	Create(ctx context.Context, record *FiscalRecord) error
	GetByID(ctx context.Context, id uuid.UUID) (*FiscalRecord, error)
	GetByStudent(ctx context.Context, studentID uuid.UUID) ([]FiscalRecord, error)
	GetAll(ctx context.Context) ([]FiscalRecord, error)
	Update(ctx context.Context, record *FiscalRecord) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetPendingByStudent(ctx context.Context, studentID uuid.UUID) ([]FiscalRecord, error)
	MarkOverdueRecords(ctx context.Context, asOf time.Time) error
	GetFiscalSummaryStats(ctx context.Context, currentMonth, currentYear int) (*FiscalSummary, error)

	// Fee Structures
	SaveFeeStructure(ctx context.Context, structure *FeeStructure) error
	GetFeeStructuresByPeriod(ctx context.Context, periodID uuid.UUID) ([]FeeStructure, error)
	GetFeeStructuresByFrequency(ctx context.Context, periodID uuid.UUID, frequency FeeFrequency) ([]FeeStructure, error)
	DeleteFeeStructure(ctx context.Context, id uuid.UUID) error

	// Wallet Transactions
	CreateWalletTransaction(ctx context.Context, tx *WalletTransaction) error
	GetWalletTransactions(ctx context.Context, studentID uuid.UUID) ([]WalletTransaction, error)

	// Budgets & Expenses
	CreateBudget(ctx context.Context, budget *Budget) error
	UpdateBudgetSpent(ctx context.Context, budgetID uuid.UUID, amount float64) error
	GetBudgets(ctx context.Context, academicYear string) ([]Budget, error)
	CreateExpenditure(ctx context.Context, exp *Expenditure) error
	CreateExpenseClaim(ctx context.Context, claim *ExpenseClaim) error
	UpdateExpenseClaimStatus(ctx context.Context, claimID uuid.UUID, status string, reviewerID uuid.UUID) error
	GetExpenseClaims(ctx context.Context, status string) ([]ExpenseClaim, error)
	GetExpenseClaimByID(ctx context.Context, claimID uuid.UUID) (*ExpenseClaim, error)

	// Debt Ageing
	GetDefaultersOlderThan(ctx context.Context, days int) ([]FiscalRecord, error)

	// Transactions
	Transaction(ctx context.Context, fn func(repo FiscalRepository) error) error

	// Scholarships / Waivers
	CreateScholarship(ctx context.Context, scholarship *Scholarship) error
	GetScholarshipByID(ctx context.Context, id uuid.UUID) (*Scholarship, error)
	GetScholarshipsByStudent(ctx context.Context, studentID uuid.UUID) ([]Scholarship, error)
	GetActiveScholarships(ctx context.Context) ([]Scholarship, error)
	UpdateScholarship(ctx context.Context, scholarship *Scholarship) error
}

type FinancialRecommendation struct {
	Type        string `json:"type"`     // ALERT, OPTIMIZATION, REVENUE_OPPORTUNITY
	Severity    string `json:"severity"` // LOW, MEDIUM, HIGH, CRITICAL
	Title       string `json:"title"`
	Description string `json:"description"`
	Action      string `json:"action"`
}

type FiscalUseCase interface {
	CreateFee(ctx context.Context, record *FiscalRecord) error
	GetStudentBalance(ctx context.Context, studentID uuid.UUID) (float64, float64, []FiscalRecord, error)
	ProcessPayment(ctx context.Context, recordID uuid.UUID) error
	ListAllRecords(ctx context.Context) ([]FiscalRecord, error)
	UpdateOverdueRecords(ctx context.Context) error
	EscalateFeeReminders(ctx context.Context) error
	GetSummary(ctx context.Context) (*FiscalSummary, error)
	GenerateRecommendations(ctx context.Context) ([]FinancialRecommendation, error)
	GeneratePupilBill(ctx context.Context, studentID uuid.UUID) ([]byte, error)
	GenerateClassBills(ctx context.Context, classID uuid.UUID) ([]byte, error)
	GeneratePaymentReceipt(ctx context.Context, recordID uuid.UUID) ([]byte, error)

	// Fee Structures
	SetFeeStructure(ctx context.Context, structure *FeeStructure) error
	GetFeeStructuresByPeriod(ctx context.Context, periodID uuid.UUID) ([]FeeStructure, error)
	GenerateTermFees(ctx context.Context, periodID uuid.UUID) (int, error)
	DeleteFeeStructure(ctx context.Context, id uuid.UUID) error

	// Scholarships
	ApplyScholarship(ctx context.Context, scholarship *Scholarship) error
	GetScholarshipsByStudent(ctx context.Context, studentID uuid.UUID) ([]Scholarship, error)
	UpdateScholarshipStatus(ctx context.Context, id uuid.UUID, status ScholarshipStatus) error

	// Year-End Rollover
	GetYearEndSummary(ctx context.Context) (*YearEndSummary, error)
	PerformYearEndRollover(ctx context.Context, newPeriodID uuid.UUID) (*YearEndResult, error)

	// Wallet & Billing Engine
	TopUpWallet(ctx context.Context, studentID uuid.UUID, amount float64, description string) error
	GetWalletInfo(ctx context.Context, studentID uuid.UUID) (float64, []WalletTransaction, error)
	ProcessAttendanceBilling(ctx context.Context, studentID uuid.UUID, periodID uuid.UUID) error
	ProcessCanteenPurchase(ctx context.Context, studentID uuid.UUID, amount float64, item string) error

	// Partial Payment
	ProcessPartialPayment(ctx context.Context, recordID uuid.UUID, amount float64, note string) error

	// Donations
	ProcessDonation(ctx context.Context, donation *Donation) error
	GetDonationsByDonor(ctx context.Context, donorID uuid.UUID) ([]Donation, error)

	// Budgets & Expenses
	SetBudget(ctx context.Context, budget *Budget) error
	GetBudgets(ctx context.Context, academicYear string) ([]Budget, error)
	RecordExpenditure(ctx context.Context, exp *Expenditure) error
	SubmitExpenseClaim(ctx context.Context, claim *ExpenseClaim) error
	GetExpenseClaims(ctx context.Context, status string) ([]ExpenseClaim, error)
	ReviewExpenseClaim(ctx context.Context, claimID uuid.UUID, reviewerID uuid.UUID, approved bool) error

	// Debt Ageing
	GetDebtAgeing(ctx context.Context) (*DebtAgeingReport, error)
}

// Donation represents a financial contribution from an Alumni or external sponsor
type Donation struct {
	TenantBase
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	DonorID       uuid.UUID `json:"donor_id" gorm:"type:uuid;index"`      // E.g., Alumni UUID
	DonorName     string    `json:"donor_name" gorm:"not null"`
	Amount        float64   `json:"amount" gorm:"not null"`
	Purpose       string    `json:"purpose"`                              // E.g., "Library Fund", "General"
	PaymentStatus string    `json:"payment_status" gorm:"default:PENDING"` // PENDING, COMPLETED, FAILED
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (d *Donation) BeforeCreate(tx *gorm.DB) (err error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return
}

type DonationRepository interface {
	Create(ctx context.Context, donation *Donation) error
	GetByDonor(ctx context.Context, donorID uuid.UUID) ([]Donation, error)
	GetTotalDonations(ctx context.Context) (float64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

// Budget represents a departmental or global school budget allocation
type Budget struct {
	TenantBase
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	AcademicYear  string    `json:"academic_year" gorm:"not null"`
	Category      string    `json:"category" gorm:"not null"`      // E.g., "Library", "IT", "General"
	AllocatedAmount float64 `json:"allocated_amount" gorm:"not null"`
	SpentAmount   float64   `json:"spent_amount" gorm:"default:0"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (b *Budget) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

// Expenditure tracks a finalized outbound payment against a budget
type Expenditure struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	BudgetID    uuid.UUID `json:"budget_id" gorm:"type:uuid;index"`
	Amount      float64   `json:"amount" gorm:"not null"`
	Description string    `json:"description" gorm:"not null"`
	Date        time.Time `json:"date" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (e *Expenditure) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

// ExpenseClaim allows staff to request reimbursement
type ExpenseClaim struct {
	TenantBase
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	RequestorID   uuid.UUID  `json:"requestor_id" gorm:"type:uuid;index;not null"`
	Amount        float64    `json:"amount" gorm:"not null"`
	Description   string     `json:"description" gorm:"not null"`
	Status        string     `json:"status" gorm:"default:PENDING_MANAGER"` // PENDING_MANAGER, PENDING_FINANCE, APPROVED, REJECTED, PAID
	ReceiptURL    string     `json:"receipt_url"`
	ManagerID     *uuid.UUID `json:"manager_id" gorm:"type:uuid"`           // Manager who approved it
	FinanceID     *uuid.UUID `json:"finance_id" gorm:"type:uuid"`           // Finance admin who approved it
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (e *ExpenseClaim) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

// DebtAgeingReport buckets outstanding debts by age
type DebtAgeingReport struct {
	Bucket30  []FiscalRecord `json:"0_30_days"`  // 0-30 days overdue
	Bucket60  []FiscalRecord `json:"31_60_days"` // 31-60 days overdue
	Bucket90  []FiscalRecord `json:"61_90_days"` // 61-90 days overdue
	BucketOld []FiscalRecord `json:"91_plus_days"` // 91+ days overdue
	Total30   float64        `json:"total_30"`
	Total60   float64        `json:"total_60"`
	Total90   float64        `json:"total_90"`
	TotalOld  float64        `json:"total_old"`
}

// ScholarshipStatus defines the status of a scholarship application/award.
type ScholarshipStatus string

const (
	ScholarshipStatusPending  ScholarshipStatus = "PENDING"
	ScholarshipStatusApproved ScholarshipStatus = "APPROVED"
	ScholarshipStatusRejected ScholarshipStatus = "REJECTED"
	ScholarshipStatusActive   ScholarshipStatus = "ACTIVE"
	ScholarshipStatusRevoked  ScholarshipStatus = "REVOKED"
)

// ScholarshipType defines the type of the waiver.
type ScholarshipType string

const (
	ScholarshipTypePercentage ScholarshipType = "PERCENTAGE"
	ScholarshipTypeFixedAmount ScholarshipType = "FIXED_AMOUNT"
)

// Scholarship represents a fee waiver or financial aid awarded to a student.
type Scholarship struct {
	TenantBase
	ID            uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID     uuid.UUID         `json:"student_id" gorm:"type:uuid;not null;index"`
	Student       *Student          `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	Name          string            `json:"name" gorm:"not null"` // e.g. "Merit Scholarship", "Staff Discount"
	Type          ScholarshipType   `json:"type" gorm:"type:varchar(20);not null"`
	Value         float64           `json:"value" gorm:"not null"` // 100 for 100%, or 500 for GH₵ 500
	Status        ScholarshipStatus `json:"status" gorm:"type:varchar(20);default:'PENDING'"`
	ValidFrom     time.Time         `json:"valid_from"`
	ValidUntil    time.Time         `json:"valid_until"`
	Reason        string            `json:"reason"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

func (s *Scholarship) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

// YearEndSummary is a snapshot of the financial state at year-end for review.
type YearEndSummary struct {
	TotalOutstanding float64 `json:"total_outstanding"`
	TotalOverdue     float64 `json:"total_overdue"`
	StudentsWithDebt int     `json:"students_with_debt"`
	TotalCarryOver   float64 `json:"total_carry_over"`
}

// YearEndResult contains the result of the year-end rollover operation.
type YearEndResult struct {
	RecordsCarriedOver  int     `json:"records_carried_over"`
	TotalAmountRolled   float64 `json:"total_amount_rolled"`
	ScholarshipsRevoked int     `json:"scholarships_revoked"`
	Message             string  `json:"message"`
}
