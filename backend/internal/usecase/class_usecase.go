package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type classUseCase struct {
	classRepo domain.ClassRepository
}

func NewClassUseCase(repo domain.ClassRepository) domain.ClassUseCase {
	return &classUseCase{classRepo: repo}
}

func (u *classUseCase) CreateClass(ctx context.Context, class *domain.Class) error {
	return u.classRepo.Create(ctx, class)
}

func (u *classUseCase) GetClassByID(ctx context.Context, id uuid.UUID) (*domain.Class, error) {
	return u.classRepo.GetByID(ctx, id)
}

func (u *classUseCase) GetAllClasses(ctx context.Context) ([]domain.Class, error) {
	return u.classRepo.GetAll(ctx)
}

func (u *classUseCase) GetClassesForTeacher(ctx context.Context, userID uuid.UUID) ([]domain.Class, error) {
	return u.classRepo.GetClassesForTeacher(ctx, userID)
}

func (u *classUseCase) UpdateClass(ctx context.Context, class *domain.Class) error {
	return u.classRepo.Update(ctx, class)
}

func (u *classUseCase) DeleteClass(ctx context.Context, id uuid.UUID) error {
	return u.classRepo.Delete(ctx, id)
}
