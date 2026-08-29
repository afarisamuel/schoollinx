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
	if err := r.db.WithContext(ctx).Preload("Teacher").Preload("ScholasticLevel").First(&class, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *classRepository) GetAll(ctx context.Context) ([]domain.Class, error) {
	var classes []domain.Class
	if err := r.db.WithContext(ctx).Preload("Teacher").Preload("ScholasticLevel").Find(&classes).Error; err != nil {
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
	err := r.db.WithContext(ctx).
		Distinct("classes.*").
		Joins("LEFT JOIN teacher_class_assignments tca ON tca.class_id = classes.id").
		Joins("LEFT JOIN teachers t ON (t.id = tca.teacher_id OR t.id = classes.teacher_id)").
		Where("t.user_id = ?", userID).
		Preload("ScholasticLevel").
		Find(&classes).Error
	if err != nil {
		return nil, err
	}
	return classes, nil
}
