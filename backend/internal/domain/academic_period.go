package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AcademicPeriod struct {
	TenantBase
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string    `json:"name" gorm:"unique;not null"` // e.g. "2023/2024"
	TermType    string    `json:"term_type" gorm:"not null"`   // e.g. "Semester" or "Term"
	TermCount   int       `json:"term_count" gorm:"not null"`  // e.g. 2 or 3
	CurrentTerm int       `json:"current_term" gorm:"default:1"`
	IsActive    bool      `json:"is_active" gorm:"default:false"`
	Terms       []AcademicTerm `json:"terms,omitempty" gorm:"foreignKey:AcademicPeriodID"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (ap *AcademicPeriod) BeforeCreate(tx *gorm.DB) (err error) {
	if ap.ID == uuid.Nil {
		ap.ID = uuid.New()
	}
	return
}

// AcademicTerm represents a single term/semester within an academic period (year).
// Each academic period can have multiple terms, each with defined start and end dates.
type AcademicTerm struct {
	TenantBase
	ID               uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	AcademicPeriodID uuid.UUID `json:"academic_period_id" gorm:"type:uuid;not null;index"`
	TermNumber       int       `json:"term_number" gorm:"not null"` // 1, 2, 3...
	Name             string    `json:"name" gorm:"not null"`        // e.g. "Term 1", "First Semester"
	StartDate        time.Time `json:"start_date" gorm:"not null"`
	EndDate          time.Time `json:"end_date" gorm:"not null"`
	IsLocked         bool      `json:"is_locked" gorm:"default:false"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (at *AcademicTerm) BeforeCreate(tx *gorm.DB) (err error) {
	if at.ID == uuid.Nil {
		at.ID = uuid.New()
	}
	return
}

type AcademicPeriodRepository interface {
	Create(ctx context.Context, ap *AcademicPeriod) error
	GetByID(ctx context.Context, id uuid.UUID) (*AcademicPeriod, error)
	GetAll(ctx context.Context) ([]AcademicPeriod, error)
	GetActive(ctx context.Context) (*AcademicPeriod, error)
	Update(ctx context.Context, ap *AcademicPeriod) error
	Delete(ctx context.Context, id uuid.UUID) error
	Activate(ctx context.Context, id uuid.UUID) error

	// Academic Term Calendar
	CreateTerm(ctx context.Context, term *AcademicTerm) error
	GetTermsByPeriod(ctx context.Context, periodID uuid.UUID) ([]AcademicTerm, error)
	UpdateTerm(ctx context.Context, term *AcademicTerm) error
	DeleteTerm(ctx context.Context, termID uuid.UUID) error
	ActivateTerm(ctx context.Context, periodID uuid.UUID, termID uuid.UUID) error
	ToggleTermLock(ctx context.Context, termID uuid.UUID) error
}

type AcademicPeriodUseCase interface {
	CreatePeriod(ctx context.Context, ap *AcademicPeriod) error
	GetPeriodByID(ctx context.Context, id uuid.UUID) (*AcademicPeriod, error)
	GetAllPeriods(ctx context.Context) ([]AcademicPeriod, error)
	GetActivePeriod(ctx context.Context) (*AcademicPeriod, error)
	UpdatePeriod(ctx context.Context, ap *AcademicPeriod) error
	DeletePeriod(ctx context.Context, id uuid.UUID) error
	ActivatePeriod(ctx context.Context, id uuid.UUID) error

	// Academic Term Calendar
	CreateTerm(ctx context.Context, term *AcademicTerm) error
	GetTermsByPeriod(ctx context.Context, periodID uuid.UUID) ([]AcademicTerm, error)
	UpdateTerm(ctx context.Context, term *AcademicTerm) error
	DeleteTerm(ctx context.Context, termID uuid.UUID) error
	ActivateTerm(ctx context.Context, periodID uuid.UUID, termID uuid.UUID) error
	ToggleTermLock(ctx context.Context, termID uuid.UUID) error
}
