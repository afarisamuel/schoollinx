package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type LedgerUseCase struct {
	repo domain.LedgerRepository
}

func NewLedgerUseCase(repo domain.LedgerRepository) *LedgerUseCase {
	return &LedgerUseCase{repo: repo}
}

func (u *LedgerUseCase) CreateAccount(ctx context.Context, account *domain.LedgerAccount) error {
	return u.repo.CreateAccount(ctx, account)
}

func (u *LedgerUseCase) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]*domain.LedgerAccount, error) {
	return u.repo.ListAccounts(ctx, tenantID)
}

func (u *LedgerUseCase) PostEntry(ctx context.Context, entry *domain.LedgerEntry) error {
	return u.repo.PostEntry(ctx, entry)
}

func (u *LedgerUseCase) GetAccountLedger(ctx context.Context, accountID uuid.UUID) ([]*domain.LedgerEntry, error) {
	return u.repo.ListEntriesByAccount(ctx, accountID)
}

func (u *LedgerUseCase) GetAccountBalance(ctx context.Context, accountID uuid.UUID) (float64, error) {
	return u.repo.GetAccountBalance(ctx, accountID)
}

func (u *LedgerUseCase) GetBalanceSheet(ctx context.Context, tenantID uuid.UUID) (map[string]float64, error) {
	return u.repo.GetBalanceSheet(ctx, tenantID)
}
