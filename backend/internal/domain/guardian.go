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
	// Students linked to this guardian
	Students []*Student `json:"students,omitempty" gorm:"many2many:student_guardians;"`
}

func (g *Guardian) BeforeCreate(tx *gorm.DB) (err error) {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return
}

type GuardianRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*Guardian, error)
	GetLinkedStudents(ctx context.Context, guardianID uuid.UUID) ([]Student, error)
	// GetForStudent returns all guardians currently linked to the given student.
	GetForStudent(ctx context.Context, studentID uuid.UUID) ([]*Guardian, error)
	GetAll(ctx context.Context) ([]Guardian, error)
	Create(ctx context.Context, guardian *Guardian) error
	Update(ctx context.Context, guardian *Guardian) error
}

type GuardianUseCase interface {
	GetGuardianProfile(ctx context.Context, userID uuid.UUID) (*Guardian, error)
	GetChildren(ctx context.Context, userID uuid.UUID) ([]Student, error)
	CreateGuardian(ctx context.Context, guardian *Guardian) error
	UpdateGuardian(ctx context.Context, guardian *Guardian) error
	ResetPassword(ctx context.Context, id uuid.UUID) (string, error)
}
