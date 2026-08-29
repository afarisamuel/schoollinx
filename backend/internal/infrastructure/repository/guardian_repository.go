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

func (r *guardianRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("id = ?", id).Preload("Students").Preload("Students.Class").First(&guardian).Error; err != nil {
		return nil, err
	}
	return &guardian, nil
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
	err := r.db.WithContext(ctx).Preload("Students").Order("created_at DESC").Find(&guardians).Error
	if err != nil {
		// Fallback query without Order("created_at DESC") if created_at column has not been added to this tenant schema yet
		err = r.db.WithContext(ctx).Preload("Students").Find(&guardians).Error
	}
	return guardians, err
}

func (r *guardianRepository) Create(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Create(guardian).Error
}

func (r *guardianRepository) Update(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Save(guardian).Error
}

func (r *guardianRepository) Delete(ctx context.Context, id uuid.UUID) error {
	guardian := &domain.Guardian{ID: id}
	_ = r.db.WithContext(ctx).Model(guardian).Association("Students").Clear()
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Guardian{}).Error
}

func (r *guardianRepository) LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	guardian := &domain.Guardian{ID: guardianID}
	student := &domain.Student{ID: studentID}
	return r.db.WithContext(ctx).Model(guardian).Association("Students").Append(student)
}

func (r *guardianRepository) UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	guardian := &domain.Guardian{ID: guardianID}
	student := &domain.Student{ID: studentID}
	return r.db.WithContext(ctx).Model(guardian).Association("Students").Delete(student)
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

func (r *guardianRepository) GetByPickupCode(ctx context.Context, code string) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("pickup_code = ?", code).Preload("Students").Preload("Students.Class").First(&guardian).Error; err != nil {
		return nil, err
	}
	return &guardian, nil
}

func (r *guardianRepository) CreateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return r.db.WithContext(ctx).Create(req).Error
}

func (r *guardianRepository) GetAbsenceRequestsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]domain.AbsenceRequest, error) {
	var list []domain.AbsenceRequest
	err := r.db.WithContext(ctx).
		Where("guardian_id = ?", guardianID).
		Preload("Student").
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *guardianRepository) GetAllAbsenceRequests(ctx context.Context) ([]domain.AbsenceRequest, error) {
	var list []domain.AbsenceRequest
	err := r.db.WithContext(ctx).
		Preload("Student").
		Preload("Guardian").
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *guardianRepository) GetAbsenceRequestByID(ctx context.Context, id uuid.UUID) (*domain.AbsenceRequest, error) {
	var req domain.AbsenceRequest
	if err := r.db.WithContext(ctx).Where("id = ?", id).Preload("Student").Preload("Guardian").First(&req).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *guardianRepository) UpdateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return r.db.WithContext(ctx).Save(req).Error
}
