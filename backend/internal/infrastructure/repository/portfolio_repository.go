package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type portfolioRepository struct {
	db *gorm.DB
}

func NewPortfolioRepository(db *gorm.DB) domain.PortfolioRepository {
	return &portfolioRepository{db: db}
}

func (r *portfolioRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) (*domain.StudentPortfolio, error) {
	var portfolio domain.StudentPortfolio
	err := r.db.WithContext(ctx).Preload("Achievements").Where("student_id = ?", studentID).First(&portfolio).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return a blank portfolio if none exists yet
			return &domain.StudentPortfolio{StudentID: studentID}, nil
		}
		return nil, err
	}
	return &portfolio, nil
}

func (r *portfolioRepository) Upsert(ctx context.Context, portfolio *domain.StudentPortfolio) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "student_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"bio", "ambition", "skills", "languages", "hobbies_json", "updated_at"}),
	}).Create(portfolio).Error
}

func (r *portfolioRepository) AddAchievement(ctx context.Context, achievement *domain.PortfolioAchievement) error {
	return r.db.WithContext(ctx).Create(achievement).Error
}

func (r *portfolioRepository) DeleteAchievement(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.PortfolioAchievement{}, "id = ?", id).Error
}

func (r *portfolioRepository) GetAchievements(ctx context.Context, portfolioID uuid.UUID) ([]domain.PortfolioAchievement, error) {
	var achievements []domain.PortfolioAchievement
	err := r.db.WithContext(ctx).Where("portfolio_id = ?", portfolioID).Order("date_earned DESC").Find(&achievements).Error
	return achievements, err
}
