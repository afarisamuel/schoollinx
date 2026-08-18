package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type scholasticLevelUseCase struct {
	repo domain.ScholasticLevelRepository
}

func NewScholasticLevelUseCase(repo domain.ScholasticLevelRepository) domain.ScholasticLevelUseCase {
	return &scholasticLevelUseCase{repo: repo}
}

func (u *scholasticLevelUseCase) CreateLevel(ctx context.Context, sl *domain.ScholasticLevel) error {
	return u.repo.Create(ctx, sl)
}

func (u *scholasticLevelUseCase) GetLevelByID(ctx context.Context, id uuid.UUID) (*domain.ScholasticLevel, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *scholasticLevelUseCase) GetAllLevels(ctx context.Context) ([]domain.ScholasticLevel, error) {
	return u.repo.GetAll(ctx)
}

func (u *scholasticLevelUseCase) UpdateLevel(ctx context.Context, sl *domain.ScholasticLevel) error {
	return u.repo.Update(ctx, sl)
}

func (u *scholasticLevelUseCase) DeleteLevel(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}
