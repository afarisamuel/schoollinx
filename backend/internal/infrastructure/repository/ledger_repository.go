package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type ledgerRepository struct {
	db *gorm.DB
}

func NewLedgerRepository(db *gorm.DB) domain.LedgerRepository {
	return &ledgerRepository{db: db}
}

func (r *ledgerRepository) CreateAccount(ctx context.Context, account *domain.LedgerAccount) error {
	if account.ID == uuid.Nil {
		account.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(account).Error
}

func (r *ledgerRepository) GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.LedgerAccount, error) {
	var account domain.LedgerAccount
	if err := r.db.WithContext(ctx).First(&account, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *ledgerRepository) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]*domain.LedgerAccount, error) {
	var rows []*domain.LedgerAccount
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("code").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *ledgerRepository) PostEntry(ctx context.Context, entry *domain.LedgerEntry) error {
	if entry.ID == uuid.Nil {
		entry.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *ledgerRepository) ListEntriesByAccount(ctx context.Context, accountID uuid.UUID) ([]*domain.LedgerEntry, error) {
	var rows []*domain.LedgerEntry
	if err := r.db.WithContext(ctx).Where("account_id = ?", accountID).Order("date DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *ledgerRepository) GetAccountBalance(ctx context.Context, accountID uuid.UUID) (float64, error) {
	type result struct {
		Balance float64
	}
	var res result
	err := r.db.WithContext(ctx).
		Model(&domain.LedgerEntry{}).
		Select("COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END), 0) AS balance").
		Where("account_id = ?", accountID).
		Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Balance, nil
}

func (r *ledgerRepository) GetBalanceSheet(ctx context.Context, tenantID uuid.UUID) (map[string]float64, error) {
	type row struct {
		Type    string
		Balance float64
	}
	var rows []row

	schema, ok := middleware.GetTenantSchemaFromContext(ctx)
	tblAccounts := "ledger_accounts"
	tblEntries := "ledger_entries"
	if ok && schema != "" && schema != "public" {
		tblAccounts = schema + ".ledger_accounts"
		tblEntries = schema + ".ledger_entries"
	}

	query := fmt.Sprintf(`
		SELECT a.type, 
			COALESCE(SUM(CASE WHEN e.type = 'DEBIT' THEN e.amount ELSE -e.amount END), 0) AS balance
		FROM %s a
		LEFT JOIN %s e ON e.account_id = a.id
		WHERE a.tenant_id = ?
		GROUP BY a.type
	`, tblAccounts, tblEntries)

	if err := r.db.WithContext(ctx).Raw(query, tenantID).Scan(&rows).Error; err != nil {
		return nil, err
	}
	balances := map[string]float64{}
	for _, rowItem := range rows {
		balances[rowItem.Type] = rowItem.Balance
	}
	return balances, nil
}
