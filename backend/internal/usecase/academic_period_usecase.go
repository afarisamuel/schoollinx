package usecase

import (
	"context"
	"time"

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
	ap, err := u.apRepo.GetActive(ctx)
	if err != nil {
		return nil, err
	}
	if ap == nil {
		return nil, nil
	}

	// Dynamic Term Resolution:
	// If the current date falls within a configured term's StartDate and EndDate,
	// automatically synchronize the period's active term to that term.
	now := time.Now()
	termFound := false
	for _, term := range ap.Terms {
		if !term.StartDate.IsZero() && !term.EndDate.IsZero() {
			if !now.Before(term.StartDate) && !now.After(term.EndDate) {
				termFound = true
				if ap.CurrentTerm != term.TermNumber {
					ap.CurrentTerm = term.TermNumber
					_ = u.apRepo.ActivateTerm(ctx, ap.ID, term.ID)
				}
				break
			}
		}
	}

	// Compulsory Active Term Fallback:
	// If current date is outside term windows but terms exist and current_term is invalid (0 or unassigned),
	// default to the first term so all subsystems (Fees, Grades, Portals) always have a valid active term.
	if !termFound && len(ap.Terms) > 0 && ap.CurrentTerm <= 0 {
		ap.CurrentTerm = ap.Terms[0].TermNumber
		_ = u.apRepo.ActivateTerm(ctx, ap.ID, ap.Terms[0].ID)
	}

	return ap, nil
}

func (u *academicPeriodUseCase) UpdatePeriod(ctx context.Context, ap *domain.AcademicPeriod) error {
	return u.apRepo.Update(ctx, ap)
}

func (u *academicPeriodUseCase) DeletePeriod(ctx context.Context, id uuid.UUID) error {
	return u.apRepo.Delete(ctx, id)
}

func (u *academicPeriodUseCase) ActivatePeriod(ctx context.Context, id uuid.UUID) error {
	if err := u.apRepo.Activate(ctx, id); err != nil {
		return err
	}

	// When activating a period, automatically activate the appropriate term
	period, err := u.apRepo.GetByID(ctx, id)
	if err == nil && period != nil && len(period.Terms) > 0 {
		now := time.Now()
		activated := false
		for _, term := range period.Terms {
			if !term.StartDate.IsZero() && !term.EndDate.IsZero() {
				if !now.Before(term.StartDate) && !now.After(term.EndDate) {
					_ = u.apRepo.ActivateTerm(ctx, id, term.ID)
					activated = true
					break
				}
			}
		}
		if !activated {
			// Default to term 1 if no date matches
			_ = u.apRepo.ActivateTerm(ctx, id, period.Terms[0].ID)
		}
	}

	return nil
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

