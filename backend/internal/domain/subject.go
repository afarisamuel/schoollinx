package domain

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Subject struct {
	TenantBase
	ID   uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name string    `json:"name"`
	Code string    `json:"code"`
}

func (s *Subject) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

type SubjectRepository interface {
	Create(ctx context.Context, subject *Subject) error
	GetAll(ctx context.Context) ([]Subject, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Subject, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
