package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type recommendationRepository struct {
	db *gorm.DB
}

func NewRecommendationRepository(db *gorm.DB) domain.RecommendationRepository {
	return &recommendationRepository{db: db}
}

func (r *recommendationRepository) SaveRecommendations(ctx context.Context, studentID uuid.UUID, recs []domain.SubjectRecommendation) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Clear existing recommendations to prevent unbounded growth/stale data
		if err := tx.Where("student_id = ?", studentID).Delete(&domain.SubjectRecommendation{}).Error; err != nil {
			return err
		}

		if len(recs) > 0 {
			if err := tx.Create(&recs).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *recommendationRepository) GetStudentRecommendations(ctx context.Context, studentID uuid.UUID) ([]domain.SubjectRecommendation, error) {
	var recs []domain.SubjectRecommendation
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Order("confidence_score DESC").Find(&recs).Error; err != nil {
		return nil, err
	}
	return recs, nil
}

func (r *recommendationRepository) DeleteStudentRecommendations(ctx context.Context, studentID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("student_id = ?", studentID).Delete(&domain.SubjectRecommendation{}).Error
}
