package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/cache"
	"gorm.io/gorm"
)

type academicPeriodRepository struct {
	db    *gorm.DB
	cache cache.CacheService
}

func NewAcademicPeriodRepository(db *gorm.DB, cacheService cache.CacheService) domain.AcademicPeriodRepository {
	return &academicPeriodRepository{db: db, cache: cacheService}
}

func (r *academicPeriodRepository) invalidateCache(ctx context.Context) {
	if r.cache == nil {
		return
	}
	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	_ = r.cache.DeletePattern(ctx, schema, "academic_period")
}

func (r *academicPeriodRepository) Create(ctx context.Context, ap *domain.AcademicPeriod) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Create(ap).Error
}

func (r *academicPeriodRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.AcademicPeriod, error) {
	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	cacheKey := fmt.Sprintf("academic_period:id:%s", id.String())
	if r.cache != nil {
		var cached domain.AcademicPeriod
		if r.cache.Get(ctx, schema, cacheKey, &cached) {
			return &cached, nil
		}
	}

	var ap domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("term_number ASC")
	}).First(&ap, "id = ?", id).Error; err != nil {
		return nil, err
	}

	if r.cache != nil {
		_ = r.cache.Set(ctx, schema, cacheKey, &ap, 30*time.Minute)
	}
	return &ap, nil
}

func (r *academicPeriodRepository) GetAll(ctx context.Context) ([]domain.AcademicPeriod, error) {
	var aps []domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("term_number ASC")
	}).Order("created_at DESC").Find(&aps).Error; err != nil {
		return nil, err
	}
	return aps, nil
}

func (r *academicPeriodRepository) GetActive(ctx context.Context) (*domain.AcademicPeriod, error) {
	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	cacheKey := "academic_period:active"
	if r.cache != nil {
		var cached domain.AcademicPeriod
		if r.cache.Get(ctx, schema, cacheKey, &cached) {
			return &cached, nil
		}
	}

	var ap domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("term_number ASC")
	}).Where("is_active = ?", true).First(&ap).Error; err != nil {
		return nil, err
	}

	if r.cache != nil {
		_ = r.cache.Set(ctx, schema, cacheKey, &ap, 30*time.Minute)
	}
	return &ap, nil
}

func (r *academicPeriodRepository) Update(ctx context.Context, ap *domain.AcademicPeriod) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Save(ap).Error
}

func (r *academicPeriodRepository) Delete(ctx context.Context, id uuid.UUID) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Delete(&domain.AcademicPeriod{}, "id = ?", id).Error
}

func (r *academicPeriodRepository) Activate(ctx context.Context, id uuid.UUID) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deactivate all first
		if err := tx.Model(&domain.AcademicPeriod{}).Where("1 = 1").Update("is_active", false).Error; err != nil {
			return err
		}
		// Activate the target
		return tx.Model(&domain.AcademicPeriod{}).Where("id = ?", id).Update("is_active", true).Error
	})
}

// Academic Term Calendar operations

func (r *academicPeriodRepository) CreateTerm(ctx context.Context, term *domain.AcademicTerm) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Create(term).Error
}

func (r *academicPeriodRepository) GetTermsByPeriod(ctx context.Context, periodID uuid.UUID) ([]domain.AcademicTerm, error) {
	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	cacheKey := fmt.Sprintf("academic_period:terms:%s", periodID.String())
	if r.cache != nil {
		var cached []domain.AcademicTerm
		if r.cache.Get(ctx, schema, cacheKey, &cached) {
			return cached, nil
		}
	}

	var terms []domain.AcademicTerm
	err := r.db.WithContext(ctx).Where("academic_period_id = ?", periodID).Order("term_number ASC").Find(&terms).Error
	if err != nil {
		return nil, err
	}

	if r.cache != nil {
		_ = r.cache.Set(ctx, schema, cacheKey, terms, 30*time.Minute)
	}
	return terms, nil
}

func (r *academicPeriodRepository) UpdateTerm(ctx context.Context, term *domain.AcademicTerm) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Save(term).Error
}

func (r *academicPeriodRepository) DeleteTerm(ctx context.Context, termID uuid.UUID) error {
	defer r.invalidateCache(ctx)
	return r.db.WithContext(ctx).Delete(&domain.AcademicTerm{}, "id = ?", termID).Error
}

func (r *academicPeriodRepository) ActivateTerm(ctx context.Context, periodID uuid.UUID, termID uuid.UUID) error {
	defer r.invalidateCache(ctx)
	var term domain.AcademicTerm
	if err := r.db.WithContext(ctx).First(&term, "id = ?", termID).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&domain.AcademicPeriod{}).Where("id = ?", periodID).Update("current_term", term.TermNumber).Error
}

func (r *academicPeriodRepository) ToggleTermLock(ctx context.Context, termID uuid.UUID) error {
	defer r.invalidateCache(ctx)
	var term domain.AcademicTerm
	if err := r.db.WithContext(ctx).First(&term, "id = ?", termID).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&term).Update("is_locked", !term.IsLocked).Error
}
