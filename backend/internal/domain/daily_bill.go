package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DailyBillStatus string

const (
	DailyBillPending  DailyBillStatus = "PENDING"
	DailyBillPaid     DailyBillStatus = "PAID"
	DailyBillOverdue  DailyBillStatus = "OVERDUE"
)

// DailyBill tracks a single day's fee for a student (e.g., canteen, transport).
type DailyBill struct {
	TenantBase
	ID          uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID   uuid.UUID       `json:"student_id" gorm:"type:uuid;not null;index"`
	Student     *Student        `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	Amount      float64         `json:"amount" gorm:"not null"`
	Date        time.Time       `json:"date" gorm:"not null;index"` // The date the bill pertains to
	Status      DailyBillStatus `json:"status" gorm:"default:PENDING;not null"`
	CollectedBy *uuid.UUID      `json:"collected_by,omitempty" gorm:"type:uuid"` // Teacher/Staff who collected
	CollectedAt *time.Time      `json:"collected_at,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (d *DailyBill) BeforeCreate(tx *gorm.DB) (err error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return
}

// DailyReconciliationSummary provides daily financial roll-up of fees
type DailyReconciliationSummary struct {
	Date                string                    `json:"date"`
	TotalBillsCount     int                       `json:"total_bills_count"`
	PaidBillsCount      int                       `json:"paid_bills_count"`
	PendingBillsCount   int                       `json:"pending_bills_count"`
	OverdueBillsCount   int                       `json:"overdue_bills_count"`
	TotalBilledAmount   float64                   `json:"total_billed_amount"`
	TotalCashCollected  float64                   `json:"total_cash_collected"`
	TotalWalletDeducted float64                   `json:"total_wallet_deducted"`
	TotalPendingAmount  float64                   `json:"total_pending_amount"`
	CollectorSummaries  []CollectorReconciliation `json:"collector_summaries"`
}

type CollectorReconciliation struct {
	CollectorID    uuid.UUID `json:"collector_id"`
	CollectorName  string    `json:"collector_name"`
	CountCollected int       `json:"count_collected"`
	TotalCash      float64   `json:"total_cash"`
}

// DailyHandoverStatus represents the workflow status of shift reconciliation
type DailyHandoverStatus string

const (
	HandoverStatusPending  DailyHandoverStatus = "PENDING"
	HandoverStatusVerified DailyHandoverStatus = "VERIFIED"
	HandoverStatusRejected DailyHandoverStatus = "REJECTED"
)

// DailyHandover represents a shift closeout / cash handover submission between a collector and the bursar
type DailyHandover struct {
	TenantBase
	ID                uuid.UUID           `json:"id" gorm:"type:uuid;primaryKey"`
	Date              time.Time           `json:"date" gorm:"not null;index"`
	CollectorID       uuid.UUID           `json:"collector_id" gorm:"type:uuid;not null;index"`
	Collector         *User               `json:"collector,omitempty" gorm:"foreignKey:CollectorID"`
	BursarID          *uuid.UUID          `json:"bursar_id,omitempty" gorm:"type:uuid"`
	Bursar            *User               `json:"bursar,omitempty" gorm:"foreignKey:BursarID"`
	ExpectedCash      float64             `json:"expected_cash" gorm:"not null"`
	ActualCash        float64             `json:"actual_cash" gorm:"not null"`
	Variance          float64             `json:"variance" gorm:"not null"` // ActualCash - ExpectedCash
	DenominationsJSON string              `json:"denominations_json" gorm:"type:text"`
	Notes             string              `json:"notes" gorm:"type:text"`
	Status            DailyHandoverStatus `json:"status" gorm:"default:PENDING;not null"`
	VerifiedAt        *time.Time          `json:"verified_at,omitempty"`
	CreatedAt         time.Time           `json:"created_at"`
	UpdatedAt         time.Time           `json:"updated_at"`
}

func (h *DailyHandover) BeforeCreate(tx *gorm.DB) (err error) {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return
}

// RouteFeePerformance tracks transit route fee revenue and clearance telemetry
type RouteFeePerformance struct {
	RouteID          uuid.UUID `json:"route_id"`
	RouteName        string    `json:"route_name"`
	DailyRate        float64   `json:"daily_rate"`
	AssignedStudents int       `json:"assigned_students"`
	BilledCount      int       `json:"billed_count"`
	PaidCount        int       `json:"paid_count"`
	PendingCount     int       `json:"pending_count"`
	TotalBilled      float64   `json:"total_billed"`
	TotalCollected   float64   `json:"total_collected"`
	ClearanceRate    float64   `json:"clearance_rate"`
}

// DailyFeeAnalytics provides deep operational insights, hourly velocity and route P&L
type DailyFeeAnalytics struct {
	Date               string                 `json:"date"`
	TotalBilled        float64                `json:"total_billed"`
	TotalCollected     float64                `json:"total_collected"`
	TotalCash          float64                `json:"total_cash"`
	TotalWallet        float64                `json:"total_wallet"`
	TotalPending       float64                `json:"total_pending"`
	OverallClearance   float64                `json:"overall_clearance"`
	RoutePerformances  []RouteFeePerformance  `json:"route_performances"`
	HourlyVelocity     map[string]float64     `json:"hourly_velocity"`
}

// DailyBillRepository defines persistence operations for daily bills and handovers.
type DailyBillRepository interface {
	BulkCreate(ctx context.Context, bills []DailyBill) error
	GetByDate(ctx context.Context, date time.Time) ([]DailyBill, error)
	GetByStudent(ctx context.Context, studentID uuid.UUID) ([]DailyBill, error)
	GetPendingByDate(ctx context.Context, date time.Time) ([]DailyBill, error)
	GetByID(ctx context.Context, id uuid.UUID) (*DailyBill, error)
	MarkPaid(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error
	BatchMarkPaid(ctx context.Context, billIDs []uuid.UUID, collectorID uuid.UUID) (int64, error)
	GetTodaysPendingBillByStudentID(ctx context.Context, studentID uuid.UUID, date time.Time) (*DailyBill, error)
	MarkOverdue(ctx context.Context, beforeDate time.Time) (int64, error)
	GetOverdueBills(ctx context.Context, beforeDate time.Time) ([]DailyBill, error)
	GetCollectionsByCollector(ctx context.Context, collectorID uuid.UUID, date time.Time) ([]DailyBill, error)
	ExistsForDate(ctx context.Context, date time.Time) (bool, error)

	// Handover persistence
	CreateHandover(ctx context.Context, handover *DailyHandover) error
	GetHandoversByDate(ctx context.Context, date time.Time) ([]DailyHandover, error)
	GetHandoverByID(ctx context.Context, id uuid.UUID) (*DailyHandover, error)
	UpdateHandover(ctx context.Context, handover *DailyHandover) error
}

// DailyBillUseCase defines business logic for daily bill management, reconciliation, and handovers.
type DailyBillUseCase interface {
	GenerateDailyBills(ctx context.Context, amount float64) (int, error)
	GenerateDailyBillsFromConfig(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error)
	GetTodaysBills(ctx context.Context) ([]DailyBill, error)
	GetStudentDailyBills(ctx context.Context, studentID uuid.UUID) ([]DailyBill, error)
	GetPendingBills(ctx context.Context) ([]DailyBill, error)
	CollectBill(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error
	BatchCollectBills(ctx context.Context, billIDs []uuid.UUID, collectorID uuid.UUID) (int64, error)
	QuickCollectStudent(ctx context.Context, identifier string, collectorID uuid.UUID) (*DailyBill, error)
	GetReconciliationSummary(ctx context.Context, date time.Time) (*DailyReconciliationSummary, error)
	GetMyCollections(ctx context.Context, collectorID uuid.UUID) ([]DailyBill, float64, error)
	RunOverdueCheck(ctx context.Context) (int64, error)
	RolloverOverdueBills(ctx context.Context, beforeDate time.Time) (int64, float64, error)
	GenerateDailyBillsForRoute(ctx context.Context, routeID uuid.UUID, periodID uuid.UUID) (int, float64, []string, error)
	GenerateDailyBillsForWalkIns(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error)
	GetPendingBillsByRoute(ctx context.Context, routeID uuid.UUID) ([]DailyBill, error)
	GetPendingBillsForWalkIns(ctx context.Context) ([]DailyBill, error)

	// Handover & Analytics Use Cases
	SubmitHandover(ctx context.Context, collectorID uuid.UUID, expectedCash, actualCash float64, denomsJSON, notes string) (*DailyHandover, error)
	VerifyHandover(ctx context.Context, handoverID uuid.UUID, bursarID uuid.UUID, status DailyHandoverStatus, notes string) (*DailyHandover, error)
	GetHandovers(ctx context.Context, date time.Time) ([]DailyHandover, error)
	GetDailyFeeAnalytics(ctx context.Context, date time.Time) (*DailyFeeAnalytics, error)
}

