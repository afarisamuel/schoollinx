package usecase

import (
	"context"

	"github.com/user/high-school-management/backend/internal/domain"
)

type auditUseCase struct {
	repo domain.AuditRepository
}

func NewAuditUseCase(repo domain.AuditRepository) domain.AuditUseCase {
	return &auditUseCase{repo: repo}
}

func (u *auditUseCase) Log(ctx context.Context, log *domain.AuditLog) error {
	return u.repo.Create(ctx, log)
}

func (u *auditUseCase) GetAllLogs(ctx context.Context) ([]domain.AuditLog, error) {
	return u.repo.GetAll(ctx)
}

func (u *auditUseCase) GetAllLogsPaginated(ctx context.Context, query domain.PaginationQuery) ([]domain.AuditLog, int64, error) {
	return u.repo.GetAllPaginated(ctx, query)
}
