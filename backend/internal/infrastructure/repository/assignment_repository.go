package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type assignmentRepository struct {
	db *gorm.DB
}

func NewAssignmentRepository(db *gorm.DB) domain.AssignmentRepository {
	return &assignmentRepository{db: db}
}

func (r *assignmentRepository) Create(ctx context.Context, assignment *domain.AcademicAssignment) error {
	return r.db.WithContext(ctx).Create(assignment).Error
}

func (r *assignmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.AcademicAssignment, error) {
	var assignment domain.AcademicAssignment
	err := r.db.WithContext(ctx).
		Preload("Teacher.User").
		Preload("Class").
		Preload("Subject").
		First(&assignment, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (r *assignmentRepository) GetByClass(ctx context.Context, classID uuid.UUID) ([]domain.AcademicAssignment, error) {
	var assignments []domain.AcademicAssignment
	err := r.db.WithContext(ctx).
		Preload("Teacher.User").
		Preload("Subject").
		Where("class_id = ?", classID).
		Find(&assignments).Error
	if err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *assignmentRepository) GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.AcademicAssignment, error) {
	var assignments []domain.AcademicAssignment
	err := r.db.WithContext(ctx).
		Preload("Class").
		Preload("Subject").
		Where("teacher_id = ?", teacherID).
		Find(&assignments).Error
	if err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *assignmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.AcademicAssignment{}, "id = ?", id).Error
}
