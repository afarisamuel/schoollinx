package domain

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type Guardian struct {
	TenantBase
	ID           uuid.UUID                               `json:"id" gorm:"type:uuid;primaryKey"`
	UserID       uuid.UUID                               `json:"user_id" gorm:"type:uuid;not null"`
	FirstName    encryption.EncryptedString              `json:"first_name"`
	LastName     encryption.EncryptedString              `json:"last_name"`
	Email        encryption.DeterministicEncryptedString `json:"email" gorm:"unique"`
	PhoneNumber  encryption.EncryptedString              `json:"phone_number"`
	Address      encryption.EncryptedString              `json:"address"`
	Relationship string                                  `json:"relationship"`
	IsPrimary    bool                                    `json:"is_primary" gorm:"default:true"`
	CanPickup    bool                                    `json:"can_pickup" gorm:"default:true"`
	PickupCode   string                                  `json:"pickup_code" gorm:"type:varchar(20)"`
	// Students linked to this guardian
	Students []*Student `json:"students,omitempty" gorm:"many2many:student_guardians;"`
}

func (g *Guardian) BeforeCreate(tx *gorm.DB) (err error) {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	if g.PickupCode == "" {
		g.PickupCode = uuid.New().String()[:8]
	}
	return
}

type AbsenceStatus string

const (
	AbsenceStatusPending  AbsenceStatus = "PENDING"
	AbsenceStatusApproved AbsenceStatus = "APPROVED"
	AbsenceStatusRejected AbsenceStatus = "REJECTED"
)

type AbsenceRequest struct {
	TenantBase
	ID          uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	GuardianID  uuid.UUID     `json:"guardian_id" gorm:"type:uuid;not null;index"`
	Guardian    *Guardian     `json:"guardian,omitempty" gorm:"foreignKey:GuardianID"`
	StudentID   uuid.UUID     `json:"student_id" gorm:"type:uuid;not null;index"`
	Student     *Student      `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	StartDate   string        `json:"start_date" gorm:"not null"`
	EndDate     string        `json:"end_date" gorm:"not null"`
	Reason      string        `json:"reason" gorm:"not null"`
	Notes       string        `json:"notes"`
	Status      AbsenceStatus `json:"status" gorm:"type:varchar(20);default:'PENDING';not null"`
	ReviewedBy  *uuid.UUID    `json:"reviewed_by,omitempty" gorm:"type:uuid"`
	ReviewNotes string        `json:"review_notes,omitempty"`
}

func (ar *AbsenceRequest) BeforeCreate(tx *gorm.DB) (err error) {
	if ar.ID == uuid.Nil {
		ar.ID = uuid.New()
	}
	if ar.Status == "" {
		ar.Status = AbsenceStatusPending
	}
	return
}

type GuardianRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Guardian, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*Guardian, error)
	GetByPickupCode(ctx context.Context, code string) (*Guardian, error)
	GetLinkedStudents(ctx context.Context, guardianID uuid.UUID) ([]Student, error)
	// GetForStudent returns all guardians currently linked to the given student.
	GetForStudent(ctx context.Context, studentID uuid.UUID) ([]*Guardian, error)
	GetAll(ctx context.Context) ([]Guardian, error)
	Create(ctx context.Context, guardian *Guardian) error
	Update(ctx context.Context, guardian *Guardian) error
	Delete(ctx context.Context, id uuid.UUID) error
	LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error
	UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error

	// Absence Requests
	CreateAbsenceRequest(ctx context.Context, req *AbsenceRequest) error
	GetAbsenceRequestsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]AbsenceRequest, error)
	GetAllAbsenceRequests(ctx context.Context) ([]AbsenceRequest, error)
	GetAbsenceRequestByID(ctx context.Context, id uuid.UUID) (*AbsenceRequest, error)
	UpdateAbsenceRequest(ctx context.Context, req *AbsenceRequest) error
}

type FamilyMemberFee struct {
	StudentID   uuid.UUID `json:"student_id"`
	StudentName string    `json:"student_name"`
	ClassName   string    `json:"class_name"`
	TotalBilled float64   `json:"total_billed"`
	TotalPaid   float64   `json:"total_paid"`
	BalanceDue  float64   `json:"balance_due"`
}

type FamilyLedgerSummary struct {
	GuardianID         uuid.UUID         `json:"guardian_id"`
	GuardianName       string            `json:"guardian_name"`
	TotalWards         int               `json:"total_wards"`
	TotalFamilyBilled  float64           `json:"total_family_billed"`
	TotalFamilyPaid    float64           `json:"total_family_paid"`
	TotalFamilyBalance float64           `json:"total_family_balance"`
	SiblingDiscountPct float64           `json:"sibling_discount_pct"`
	Wards              []FamilyMemberFee `json:"wards"`
}

type GuardianUseCase interface {
	GetAllGuardians(ctx context.Context) ([]Guardian, error)
	GetGuardianByID(ctx context.Context, id uuid.UUID) (*Guardian, error)
	GetGuardianProfile(ctx context.Context, userID uuid.UUID) (*Guardian, error)
	GetChildren(ctx context.Context, userID uuid.UUID) ([]Student, error)
	CreateGuardian(ctx context.Context, guardian *Guardian) (string, error)
	UpdateGuardian(ctx context.Context, guardian *Guardian) error
	DeleteGuardian(ctx context.Context, id uuid.UUID) error
	LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error
	UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error
	ResetPassword(ctx context.Context, id uuid.UUID) (string, error)

	// Family Ledger & Campus Security
	GetFamilyLedger(ctx context.Context, guardianID uuid.UUID) (*FamilyLedgerSummary, error)
	VerifyPickupPass(ctx context.Context, code string) (*Guardian, error)

	// Absence Requests
	SubmitAbsenceRequest(ctx context.Context, guardianUserID uuid.UUID, req *AbsenceRequest) error
	GetAbsenceRequestsForGuardian(ctx context.Context, guardianUserID uuid.UUID) ([]AbsenceRequest, error)
	GetAllAbsenceRequests(ctx context.Context) ([]AbsenceRequest, error)
	ReviewAbsenceRequest(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, status AbsenceStatus, notes string) error

	// Bulk Ingestion & Onboarding
	BulkImportGuardians(ctx context.Context, csvData []byte) (imported int, skipped int, err error)
	SendPortalInvites(ctx context.Context) (int, error)
}
