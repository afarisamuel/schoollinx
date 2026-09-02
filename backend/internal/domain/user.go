package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type Role string

const (
	RoleEcopowerAdmin     Role = "ECOPOWER_ADMIN"
	RoleAdmin             Role = "ADMIN"
	RoleTeacher           Role = "TEACHER"
	RoleStudent           Role = "STUDENT"
	RoleGuardian          Role = "GUARDIAN"
	RoleLibrarian         Role = "LIBRARIAN"
	RoleAccountant        Role = "ACCOUNTANT"
	RoleBursar            Role = "BURSAR"
	RoleHRManager         Role = "HR_MANAGER"
	RoleLogisticsManager  Role = "LOGISTICS_MANAGER"
	RoleOperationsManager Role = "OPERATIONS_MANAGER"
	RoleHeadmaster        Role = "HEADMASTER"
	RoleClerk             Role = "CLERK"
	RoleNurse             Role = "NURSE"
	RoleITAdmin           Role = "IT_ADMIN"
)

type User struct {
	TenantBase
	ID                  uuid.UUID                                `json:"id" gorm:"type:uuid;primaryKey"`
	Email               encryption.DeterministicEncryptedString  `json:"email" gorm:"unique;not null"`
	Username            *encryption.DeterministicEncryptedString `json:"username" gorm:"unique"`
	PhoneNumber         *encryption.DeterministicEncryptedString `json:"phone_number" gorm:"unique"`
	Password            string                                   `json:"-" gorm:"not null"` // Hashed password
	Role                Role                                     `json:"role" gorm:"not null"`
	MustChangePassword  bool                                     `json:"must_change_password" gorm:"default:false"`
	SetupToken          *string                                  `json:"-" gorm:"index"`
	SetupTokenExpiresAt *time.Time                               `json:"-"`
	ResetToken          *string                                  `json:"-" gorm:"index"`
	ResetTokenExpiresAt *time.Time                               `json:"-"`
	TwoFactorEnabled    bool                                     `json:"two_factor_enabled" gorm:"default:false"`
	TwoFactorSecret     *encryption.DeterministicEncryptedString `json:"-"`
	OTPCode             *string                                  `json:"-" gorm:"index"`
	OTPExpiresAt        *time.Time                               `json:"-"`
	CustomPermissions   pq.StringArray                           `json:"custom_permissions" gorm:"type:text[]"`
	CreatedAt           time.Time                                `json:"created_at"`
	UpdatedAt           time.Time                                `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return
}

// UserRepository provides generic access to user records.
// Kept minimal to avoid duplicating auth-specific logic.
type UserRepository interface {
	GetAll(ctx context.Context) ([]User, error)
	GetByRole(ctx context.Context, role Role) ([]User, error)
	GetByIdentifier(ctx context.Context, identifier string) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetBySetupToken(ctx context.Context, token string) (*User, error)
	GetByResetToken(ctx context.Context, token string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
}
