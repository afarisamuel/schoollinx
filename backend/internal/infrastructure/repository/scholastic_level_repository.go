package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type scholasticLevelRepository struct {
	db *gorm.DB
}

func NewScholasticLevelRepository(db *gorm.DB) domain.ScholasticLevelRepository {
	return &scholasticLevelRepository{db: db}
}

func (r *scholasticLevelRepository) Create(ctx context.Context, sl *domain.ScholasticLevel) error {
	return r.db.WithContext(ctx).Create(sl).Error
}

func (r *scholasticLevelRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ScholasticLevel, error) {
	var sl domain.ScholasticLevel
	if err := r.db.WithContext(ctx).First(&sl, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &sl, nil
}

func (r *scholasticLevelRepository) GetAll(ctx context.Context) ([]domain.ScholasticLevel, error) {
	var sls []domain.ScholasticLevel
	if err := r.db.WithContext(ctx).Order("ordinal ASC").Find(&sls).Error; err != nil {
		return nil, err
	}
	return sls, nil
}

func (r *scholasticLevelRepository) Update(ctx context.Context, sl *domain.ScholasticLevel) error {
	return r.db.WithContext(ctx).Save(sl).Error
}

func (r *scholasticLevelRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.ScholasticLevel{}, "id = ?", id).Error
}
