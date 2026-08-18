package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type teacherRepository struct {
	db *gorm.DB
}

func NewTeacherRepository(db *gorm.DB) domain.TeacherRepository {
	return &teacherRepository{db: db}
}

func (r *teacherRepository) Create(ctx context.Context, teacher *domain.Teacher) error {
	return r.db.WithContext(ctx).Create(teacher).Error
}

func (r *teacherRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Teacher, error) {
	var teacher domain.Teacher
	if err := r.db.WithContext(ctx).Preload("User").Preload("Subjects").First(&teacher, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &teacher, nil
}

func (r *teacherRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Teacher, error) {
	var teacher domain.Teacher
	if err := r.db.WithContext(ctx).Preload("User").Preload("Subjects").Where("user_id = ?", userID).First(&teacher).Error; err != nil {
		return nil, err
	}
	return &teacher, nil
}

func (r *teacherRepository) GetAll(ctx context.Context) ([]domain.Teacher, error) {
	var teachers []domain.Teacher
	if err := r.db.WithContext(ctx).Preload("User").Preload("Subjects").Find(&teachers).Error; err != nil {
		return nil, err
	}
	return teachers, nil
}


func (r *teacherRepository) Update(ctx context.Context, teacher *domain.Teacher) error {
	return r.db.WithContext(ctx).Save(teacher).Error
}

func (r *teacherRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Teacher{}, "id = ?", id).Error
}

// --- Class Assignment methods ---

func (r *teacherRepository) AssignToClass(ctx context.Context, a *domain.TeacherClassAssignment) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *teacherRepository) BulkAssignToClass(ctx context.Context, assignments []domain.TeacherClassAssignment) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if len(assignments) == 0 {
			return nil
		}
		// Batch create with GORM
		return tx.Create(&assignments).Error
	})
}

func (r *teacherRepository) UnassignFromClass(ctx context.Context, assignmentID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.TeacherClassAssignment{}, "id = ?", assignmentID).Error
}

func (r *teacherRepository) GetAssignments(ctx context.Context, teacherID uuid.UUID) ([]domain.TeacherClassAssignment, error) {
	var assignments []domain.TeacherClassAssignment
	err := r.db.WithContext(ctx).
		Preload("Class").
		Preload("Subject").
		Where("teacher_id = ?", teacherID).
		Find(&assignments).Error
	return assignments, err
}

func (r *teacherRepository) GetAllAssignments(ctx context.Context) ([]domain.TeacherClassAssignment, error) {
	var assignments []domain.TeacherClassAssignment
	err := r.db.WithContext(ctx).
		Preload("Teacher").
		Preload("Class").
		Preload("Subject").
		Find(&assignments).Error
	return assignments, err
}
