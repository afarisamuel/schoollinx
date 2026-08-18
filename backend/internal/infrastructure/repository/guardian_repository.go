package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type guardianRepository struct {
	db *gorm.DB
}

func NewGuardianRepository(db *gorm.DB) domain.GuardianRepository {
	return &guardianRepository{db: db}
}

func (r *guardianRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Preload("Students").First(&guardian).Error; err != nil {
		return nil, err
	}

	return &guardian, nil
}

func (r *guardianRepository) GetLinkedStudents(ctx context.Context, guardianID uuid.UUID) ([]domain.Student, error) {
	var students []domain.Student
	err := r.db.WithContext(ctx).
		Joins("JOIN student_guardians ON student_guardians.student_id = students.id").
		Where("student_guardians.guardian_id = ?", guardianID).
		Preload("User").
		Find(&students).Error

	return students, err
}

func (r *guardianRepository) GetAll(ctx context.Context) ([]domain.Guardian, error) {
	var guardians []domain.Guardian
	err := r.db.WithContext(ctx).Find(&guardians).Error
	return guardians, err
}

func (r *guardianRepository) Create(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Create(guardian).Error
}

func (r *guardianRepository) Update(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Save(guardian).Error
}

// GetForStudent returns all guardians linked to a student via the student_guardians join table.
func (r *guardianRepository) GetForStudent(ctx context.Context, studentID uuid.UUID) ([]*domain.Guardian, error) {
	var guardians []*domain.Guardian
	err := r.db.WithContext(ctx).
		Joins("JOIN student_guardians ON student_guardians.guardian_id = guardians.id").
		Where("student_guardians.student_id = ?", studentID).
		Find(&guardians).Error
	return guardians, err
}
