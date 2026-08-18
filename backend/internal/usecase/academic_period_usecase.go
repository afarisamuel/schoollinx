package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type academicPeriodUseCase struct {
	apRepo domain.AcademicPeriodRepository
}

func NewAcademicPeriodUseCase(repo domain.AcademicPeriodRepository) domain.AcademicPeriodUseCase {
	return &academicPeriodUseCase{apRepo: repo}
}

func (u *academicPeriodUseCase) CreatePeriod(ctx context.Context, ap *domain.AcademicPeriod) error {
	return u.apRepo.Create(ctx, ap)
}

func (u *academicPeriodUseCase) GetPeriodByID(ctx context.Context, id uuid.UUID) (*domain.AcademicPeriod, error) {
	return u.apRepo.GetByID(ctx, id)
}

func (u *academicPeriodUseCase) GetAllPeriods(ctx context.Context) ([]domain.AcademicPeriod, error) {
	return u.apRepo.GetAll(ctx)
}

func (u *academicPeriodUseCase) GetActivePeriod(ctx context.Context) (*domain.AcademicPeriod, error) {
	return u.apRepo.GetActive(ctx)
}

func (u *academicPeriodUseCase) UpdatePeriod(ctx context.Context, ap *domain.AcademicPeriod) error {
	return u.apRepo.Update(ctx, ap)
}

func (u *academicPeriodUseCase) DeletePeriod(ctx context.Context, id uuid.UUID) error {
	return u.apRepo.Delete(ctx, id)
}

func (u *academicPeriodUseCase) ActivatePeriod(ctx context.Context, id uuid.UUID) error {
	return u.apRepo.Activate(ctx, id)
}

// Academic Term Calendar

func (u *academicPeriodUseCase) CreateTerm(ctx context.Context, term *domain.AcademicTerm) error {
	return u.apRepo.CreateTerm(ctx, term)
}

func (u *academicPeriodUseCase) GetTermsByPeriod(ctx context.Context, periodID uuid.UUID) ([]domain.AcademicTerm, error) {
	return u.apRepo.GetTermsByPeriod(ctx, periodID)
}

func (u *academicPeriodUseCase) UpdateTerm(ctx context.Context, term *domain.AcademicTerm) error {
	return u.apRepo.UpdateTerm(ctx, term)
}

func (u *academicPeriodUseCase) DeleteTerm(ctx context.Context, termID uuid.UUID) error {
	return u.apRepo.DeleteTerm(ctx, termID)
}

func (u *academicPeriodUseCase) ActivateTerm(ctx context.Context, periodID uuid.UUID, termID uuid.UUID) error {
	return u.apRepo.ActivateTerm(ctx, periodID, termID)
}

func (u *academicPeriodUseCase) ToggleTermLock(ctx context.Context, termID uuid.UUID) error {
	return u.apRepo.ToggleTermLock(ctx, termID)
}

