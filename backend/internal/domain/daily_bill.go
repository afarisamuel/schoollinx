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

// DailyBillRepository defines persistence operations for daily bills.
type DailyBillRepository interface {
	BulkCreate(ctx context.Context, bills []DailyBill) error
	GetByDate(ctx context.Context, date time.Time) ([]DailyBill, error)
	GetByStudent(ctx context.Context, studentID uuid.UUID) ([]DailyBill, error)
	GetPendingByDate(ctx context.Context, date time.Time) ([]DailyBill, error)
	GetByID(ctx context.Context, id uuid.UUID) (*DailyBill, error)
	MarkPaid(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error
	MarkOverdue(ctx context.Context, beforeDate time.Time) (int64, error)
	GetCollectionsByCollector(ctx context.Context, collectorID uuid.UUID, date time.Time) ([]DailyBill, error)
	ExistsForDate(ctx context.Context, date time.Time) (bool, error)
}

// DailyBillUseCase defines business logic for daily bill management.
type DailyBillUseCase interface {
	GenerateDailyBills(ctx context.Context, amount float64) (int, error)
	GenerateDailyBillsFromConfig(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error)
	GetTodaysBills(ctx context.Context) ([]DailyBill, error)
	GetStudentDailyBills(ctx context.Context, studentID uuid.UUID) ([]DailyBill, error)
	GetPendingBills(ctx context.Context) ([]DailyBill, error)
	CollectBill(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error
	GetMyCollections(ctx context.Context, collectorID uuid.UUID) ([]DailyBill, float64, error)
	RunOverdueCheck(ctx context.Context) (int64, error)
	GenerateDailyBillsForRoute(ctx context.Context, routeID uuid.UUID, periodID uuid.UUID) (int, float64, []string, error)
	GenerateDailyBillsForWalkIns(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error)
	GetPendingBillsByRoute(ctx context.Context, routeID uuid.UUID) ([]DailyBill, error)
	GetPendingBillsForWalkIns(ctx context.Context) ([]DailyBill, error)
}
