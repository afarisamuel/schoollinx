package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OnboardingStatus string

const (
	OnboardingPending   OnboardingStatus = "PENDING"
	OnboardingCompleted OnboardingStatus = "COMPLETED"
)

type OnboardingChecklist struct {
	TenantBase
	ID                   uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID              uuid.UUID        `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff                *StaffProfile    `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	ContractSigned       bool             `json:"contract_signed" gorm:"default:false"`
	IDProvided           bool             `json:"id_provided" gorm:"default:false"`
	BankDetailsVerified  bool             `json:"bank_details_verified" gorm:"default:false"`
	EquipmentAssigned    bool             `json:"equipment_assigned" gorm:"default:false"`
	OrientationCompleted bool             `json:"orientation_completed" gorm:"default:false"`
	Status               OnboardingStatus `json:"status" gorm:"default:'PENDING'"`
	CreatedAt            time.Time        `json:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at"`
}

func (o *OnboardingChecklist) BeforeCreate(tx *gorm.DB) (err error) {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return
}

type OnboardingRepository interface {
	CreateOnboardingChecklist(ctx context.Context, checklist *OnboardingChecklist) error
	GetChecklistByStaff(ctx context.Context, staffID uuid.UUID) (*OnboardingChecklist, error)
	UpdateChecklist(ctx context.Context, checklist *OnboardingChecklist) error
}
