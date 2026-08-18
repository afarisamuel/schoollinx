package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type SubjectUseCase struct {
	repo domain.SubjectRepository
}

func NewSubjectUseCase(repo domain.SubjectRepository) *SubjectUseCase {
	return &SubjectUseCase{repo: repo}
}

func (u *SubjectUseCase) CreateSubject(ctx context.Context, subject *domain.Subject) error {
	return u.repo.Create(ctx, subject)
}

func (u *SubjectUseCase) GetAllSubjects(ctx context.Context) ([]domain.Subject, error) {
	return u.repo.GetAll(ctx)
}

func (u *SubjectUseCase) DeleteSubject(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}
