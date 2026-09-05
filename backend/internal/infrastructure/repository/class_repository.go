package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type classRepository struct {
	db *gorm.DB
}

func NewClassRepository(db *gorm.DB) domain.ClassRepository {
	return &classRepository{db: db}
}

func (r *classRepository) Create(ctx context.Context, class *domain.Class) error {
	return r.db.WithContext(ctx).Create(class).Error
}

func (r *classRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Class, error) {
	var class domain.Class
	if err := r.db.WithContext(ctx).Preload("Teacher").Preload("ScholasticLevel").Preload("Subjects").First(&class, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *classRepository) GetAll(ctx context.Context) ([]domain.Class, error) {
	var classes []domain.Class
	if err := r.db.WithContext(ctx).Preload("Teacher").Preload("ScholasticLevel").Preload("Subjects").Find(&classes).Error; err != nil {
		return nil, err
	}
	return classes, nil
}


func (r *classRepository) Update(ctx context.Context, class *domain.Class) error {
	return r.db.WithContext(ctx).Save(class).Error
}

func (r *classRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Class{}, "id = ?", id).Error
}

func (r *classRepository) GetLocks(ctx context.Context, classID uuid.UUID) ([]domain.ClassTermLock, error) {
	var locks []domain.ClassTermLock
	if err := r.db.WithContext(ctx).Where("class_id = ?", classID).Find(&locks).Error; err != nil {
		return nil, err
	}
	return locks, nil
}

func (r *classRepository) UpsertLock(ctx context.Context, lock *domain.ClassTermLock) error {
	var existing domain.ClassTermLock
	err := r.db.WithContext(ctx).Where("class_id = ? AND term = ?", lock.ClassID, lock.Term).First(&existing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	if err == gorm.ErrRecordNotFound {
		return r.db.WithContext(ctx).Create(lock).Error
	}

	existing.IsLocked = lock.IsLocked
	return r.db.WithContext(ctx).Save(&existing).Error
}

func (r *classRepository) IsLocked(ctx context.Context, classID uuid.UUID, term string) (bool, error) {
	var lock domain.ClassTermLock
	err := r.db.WithContext(ctx).Where("class_id = ? AND term = ?", classID, term).First(&lock).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil // Default is unlocked if record missing
		}
		return false, err
	}
	return lock.IsLocked, nil
}

func (r *classRepository) GetClassesForTeacher(ctx context.Context, userID uuid.UUID) ([]domain.Class, error) {
	var classes []domain.Class

	// 1. Resolve Teacher ID by user_id or email
	var teacherID *uuid.UUID
	var teacher domain.Teacher
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&teacher).Error; err == nil {
		teacherID = &teacher.ID
	} else {
		var user domain.User
		if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err == nil && string(user.Email) != "" {
			if err := r.db.WithContext(ctx).Where("email = ?", user.Email).First(&teacher).Error; err == nil {
				teacherID = &teacher.ID
			}
		}
	}

	// Fallback for single-teacher school environments
	if teacherID == nil {
		var count int64
		r.db.WithContext(ctx).Model(&domain.Teacher{}).Count(&count)
		if count == 1 {
			if err := r.db.WithContext(ctx).First(&teacher).Error; err == nil {
				teacherID = &teacher.ID
			}
		}
	}

	if teacherID == nil {
		return []domain.Class{}, nil
	}

	// 2. Query classes assigned via primary teacher_id or teacher_class_assignments
	var classIDs []uuid.UUID
	_ = r.db.WithContext(ctx).Table("teacher_class_assignments").Where("teacher_id = ?", *teacherID).Pluck("class_id", &classIDs)

	query := r.db.WithContext(ctx).Model(&domain.Class{})
	if len(classIDs) > 0 {
		query = query.Where("teacher_id = ? OR id IN ?", *teacherID, classIDs)
	} else {
		query = query.Where("teacher_id = ?", *teacherID)
	}

	err := query.Preload("ScholasticLevel").Preload("Subjects").Find(&classes).Error
	if err != nil {
		return nil, err
	}
	return classes, nil
}

func (r *classRepository) GetClassSubjects(ctx context.Context, classID uuid.UUID) ([]domain.Subject, error) {
	var class domain.Class
	if err := r.db.WithContext(ctx).Preload("Subjects").First(&class, "id = ?", classID).Error; err != nil {
		return nil, err
	}
	return class.Subjects, nil
}

func (r *classRepository) SetClassSubjects(ctx context.Context, classID uuid.UUID, subjectIDs []uuid.UUID) error {
	var class domain.Class
	if err := r.db.WithContext(ctx).First(&class, "id = ?", classID).Error; err != nil {
		return err
	}

	var subjects []domain.Subject
	if len(subjectIDs) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ?", subjectIDs).Find(&subjects).Error; err != nil {
			return err
		}
	}

	return r.db.WithContext(ctx).Model(&class).Association("Subjects").Replace(subjects)
}
