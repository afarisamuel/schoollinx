package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type portfolioUseCase struct {
	repo domain.PortfolioRepository
}

func NewPortfolioUseCase(repo domain.PortfolioRepository) domain.PortfolioUseCase {
	return &portfolioUseCase{repo: repo}
}

func (u *portfolioUseCase) GetStudentPortfolio(ctx context.Context, studentID uuid.UUID) (*domain.StudentPortfolio, error) {
	return u.repo.GetByStudent(ctx, studentID)
}

func (u *portfolioUseCase) SaveStudentPortfolio(ctx context.Context, studentID uuid.UUID, portfolio *domain.StudentPortfolio) error {
	portfolio.StudentID = studentID
	return u.repo.Upsert(ctx, portfolio)
}

func (u *portfolioUseCase) AddAchievement(ctx context.Context, studentID uuid.UUID, achievement *domain.PortfolioAchievement) error {
	// Get or create portfolio first to get the ID
	p, err := u.repo.GetByStudent(ctx, studentID)
	if err != nil {
		return err
	}
	// If portfolio doesn't exist yet, create it
	if p.ID == uuid.Nil {
		if err := u.repo.Upsert(ctx, p); err != nil {
			return err
		}
	}
	achievement.PortfolioID = p.ID
	return u.repo.AddAchievement(ctx, achievement)
}

func (u *portfolioUseCase) DeleteAchievement(ctx context.Context, achievementID uuid.UUID) error {
	return u.repo.DeleteAchievement(ctx, achievementID)
}
