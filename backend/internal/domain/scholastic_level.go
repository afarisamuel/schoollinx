package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScholasticLevel struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name      string    `json:"name" gorm:"unique;not null"` // e.g. "Grade 1", "JHS 1"
	Ordinal   int       `json:"ordinal" gorm:"not null"`     // 1, 2, 3...
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (sl *ScholasticLevel) BeforeCreate(tx *gorm.DB) (err error) {
	if sl.ID == uuid.Nil {
		sl.ID = uuid.New()
	}
	return
}

type ScholasticLevelRepository interface {
	Create(ctx context.Context, sl *ScholasticLevel) error
	GetByID(ctx context.Context, id uuid.UUID) (*ScholasticLevel, error)
	GetAll(ctx context.Context) ([]ScholasticLevel, error)
	Update(ctx context.Context, sl *ScholasticLevel) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type ScholasticLevelUseCase interface {
	CreateLevel(ctx context.Context, sl *ScholasticLevel) error
	GetLevelByID(ctx context.Context, id uuid.UUID) (*ScholasticLevel, error)
	GetAllLevels(ctx context.Context) ([]ScholasticLevel, error)
	UpdateLevel(ctx context.Context, sl *ScholasticLevel) error
	DeleteLevel(ctx context.Context, id uuid.UUID) error
}
