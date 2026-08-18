package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type SubjectRepository struct {
	db *gorm.DB
}

func NewSubjectRepository(db *gorm.DB) *SubjectRepository {
	return &SubjectRepository{db: db}
}

func (r *SubjectRepository) Create(ctx context.Context, subject *domain.Subject) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(subject).Error
}

func (r *SubjectRepository) GetAll(ctx context.Context) ([]domain.Subject, error) {
	var subjects []domain.Subject
	if r.db == nil {
		return subjects, nil
	}
	err := r.db.WithContext(ctx).Find(&subjects).Error
	return subjects, err
}

func (r *SubjectRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Subject, error) {
	var subject domain.Subject
	if r.db == nil {
		return &subject, nil
	}
	err := r.db.WithContext(ctx).First(&subject, "id = ?", id).Error
	return &subject, err
}

func (r *SubjectRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Delete(&domain.Subject{}, "id = ?", id).Error
}
