package domain

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Department struct {
	TenantBase
	ID     uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name   string    `json:"name" gorm:"not null"`
	HeadID uuid.UUID `json:"head_id" gorm:"type:uuid"` // Link to Teacher (Department Head)
	Head   *Teacher  `json:"head,omitempty" gorm:"foreignKey:HeadID"`
}

func (d *Department) BeforeCreate(tx *gorm.DB) (err error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return
}

type DepartmentRepository interface {
	Create(ctx context.Context, dept *Department) error
	GetByID(ctx context.Context, id uuid.UUID) (*Department, error)
	GetAll(ctx context.Context) ([]Department, error)
	Update(ctx context.Context, dept *Department) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type DepartmentUseCase interface {
	CreateDepartment(ctx context.Context, dept *Department) error
	GetDepartmentByID(ctx context.Context, id uuid.UUID) (*Department, error)
	GetAllDepartments(ctx context.Context) ([]Department, error)
	UpdateDepartment(ctx context.Context, dept *Department) error
	DeleteDepartment(ctx context.Context, id uuid.UUID) error
}
