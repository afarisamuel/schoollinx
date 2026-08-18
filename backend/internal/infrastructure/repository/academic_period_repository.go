package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type academicPeriodRepository struct {
	db *gorm.DB
}

func NewAcademicPeriodRepository(db *gorm.DB) domain.AcademicPeriodRepository {
	return &academicPeriodRepository{db: db}
}

func (r *academicPeriodRepository) Create(ctx context.Context, ap *domain.AcademicPeriod) error {
	return r.db.WithContext(ctx).Create(ap).Error
}

func (r *academicPeriodRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.AcademicPeriod, error) {
	var ap domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("term_number ASC")
	}).First(&ap, "id = ?", id).Error; err != nil {
		return nil, err
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
	var ap domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("term_number ASC")
	}).Where("is_active = ?", true).First(&ap).Error; err != nil {
		return nil, err
	}
	return &ap, nil
}

func (r *academicPeriodRepository) Update(ctx context.Context, ap *domain.AcademicPeriod) error {
	return r.db.WithContext(ctx).Save(ap).Error
}

func (r *academicPeriodRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.AcademicPeriod{}, "id = ?", id).Error
}

func (r *academicPeriodRepository) Activate(ctx context.Context, id uuid.UUID) error {
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
	return r.db.WithContext(ctx).Create(term).Error
}

func (r *academicPeriodRepository) GetTermsByPeriod(ctx context.Context, periodID uuid.UUID) ([]domain.AcademicTerm, error) {
	var terms []domain.AcademicTerm
	err := r.db.WithContext(ctx).Where("academic_period_id = ?", periodID).Order("term_number ASC").Find(&terms).Error
	return terms, err
}

func (r *academicPeriodRepository) UpdateTerm(ctx context.Context, term *domain.AcademicTerm) error {
	return r.db.WithContext(ctx).Save(term).Error
}

func (r *academicPeriodRepository) DeleteTerm(ctx context.Context, termID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.AcademicTerm{}, "id = ?", termID).Error
}

func (r *academicPeriodRepository) ActivateTerm(ctx context.Context, periodID uuid.UUID, termID uuid.UUID) error {
	var term domain.AcademicTerm
	if err := r.db.WithContext(ctx).First(&term, "id = ?", termID).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&domain.AcademicPeriod{}).Where("id = ?", periodID).Update("current_term", term.TermNumber).Error
}

func (r *academicPeriodRepository) ToggleTermLock(ctx context.Context, termID uuid.UUID) error {
	var term domain.AcademicTerm
	if err := r.db.WithContext(ctx).First(&term, "id = ?", termID).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&term).Update("is_locked", !term.IsLocked).Error
}

