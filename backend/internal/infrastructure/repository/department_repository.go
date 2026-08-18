package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type departmentRepository struct {
	db *gorm.DB
}

func NewDepartmentRepository(db *gorm.DB) domain.DepartmentRepository {
	return &departmentRepository{db: db}
}

func (r *departmentRepository) Create(ctx context.Context, dept *domain.Department) error {
	return r.db.WithContext(ctx).Create(dept).Error
}

func (r *departmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Department, error) {
	var dept domain.Department
	if err := r.db.WithContext(ctx).Preload("Head.User").First(&dept, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &dept, nil
}

func (r *departmentRepository) GetAll(ctx context.Context) ([]domain.Department, error) {
	var depts []domain.Department
	if err := r.db.WithContext(ctx).Preload("Head.User").Find(&depts).Error; err != nil {
		return nil, err
	}
	return depts, nil
}


func (r *departmentRepository) Update(ctx context.Context, dept *domain.Department) error {
	return r.db.WithContext(ctx).Save(dept).Error
}

func (r *departmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Department{}, "id = ?", id).Error
}
