package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

// LedgerAccount GORM model
type LedgerAccountGorm struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Code        string    `gorm:"size:50;not null"`
	Name        string    `gorm:"size:255;not null"`
	Type        string    `gorm:"size:50;not null"`
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (LedgerAccountGorm) TableName() string { return "ledger_accounts" }

// LedgerEntry GORM model
type LedgerEntryGorm struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index"`
	AccountID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Type        string    `gorm:"size:10;not null"`
	Amount      float64   `gorm:"type:decimal(15,2)"`
	Reference   string    `gorm:"size:255"`
	Description string
	Date        time.Time
	CreatedAt   time.Time
}

func (LedgerEntryGorm) TableName() string { return "ledger_entries" }

type ledgerRepository struct {
	db *gorm.DB
}

func NewLedgerRepository(db *gorm.DB) domain.LedgerRepository {
	return &ledgerRepository{db: db}
}

func (r *ledgerRepository) CreateAccount(ctx context.Context, account *domain.LedgerAccount) error {
	m := &LedgerAccountGorm{
		ID:          account.ID,
		TenantID:    account.TenantID,
		Code:        account.Code,
		Name:        account.Name,
		Type:        string(account.Type),
		Description: account.Description,
	}
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	account.ID = m.ID
	account.CreatedAt = m.CreatedAt
	account.UpdatedAt = m.UpdatedAt
	return nil
}

func (r *ledgerRepository) GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.LedgerAccount, error) {
	var m LedgerAccountGorm
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &domain.LedgerAccount{
		ID:          m.ID,
		TenantID:    m.TenantID,
		Code:        m.Code,
		Name:        m.Name,
		Type:        domain.AccountType(m.Type),
		Description: m.Description,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}, nil
}

func (r *ledgerRepository) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]*domain.LedgerAccount, error) {
	var rows []LedgerAccountGorm
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("code").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]*domain.LedgerAccount, len(rows))
	for i, m := range rows {
		result[i] = &domain.LedgerAccount{
			ID:          m.ID,
			TenantID:    m.TenantID,
			Code:        m.Code,
			Name:        m.Name,
			Type:        domain.AccountType(m.Type),
			Description: m.Description,
			CreatedAt:   m.CreatedAt,
			UpdatedAt:   m.UpdatedAt,
		}
	}
	return result, nil
}

func (r *ledgerRepository) PostEntry(ctx context.Context, entry *domain.LedgerEntry) error {
	m := &LedgerEntryGorm{
		ID:          entry.ID,
		TenantID:    entry.TenantID,
		AccountID:   entry.AccountID,
		Type:        string(entry.Type),
		Amount:      entry.Amount,
		Reference:   entry.Reference,
		Description: entry.Description,
		Date:        entry.Date,
	}
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	entry.ID = m.ID
	entry.CreatedAt = m.CreatedAt
	return nil
}

func (r *ledgerRepository) ListEntriesByAccount(ctx context.Context, accountID uuid.UUID) ([]*domain.LedgerEntry, error) {
	var rows []LedgerEntryGorm
	if err := r.db.WithContext(ctx).Where("account_id = ?", accountID).Order("date DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]*domain.LedgerEntry, len(rows))
	for i, m := range rows {
		result[i] = &domain.LedgerEntry{
			ID:          m.ID,
			TenantID:    m.TenantID,
			AccountID:   m.AccountID,
			Type:        domain.EntryType(m.Type),
			Amount:      m.Amount,
			Reference:   m.Reference,
			Description: m.Description,
			Date:        m.Date,
			CreatedAt:   m.CreatedAt,
		}
	}
	return result, nil
}

func (r *ledgerRepository) GetAccountBalance(ctx context.Context, accountID uuid.UUID) (float64, error) {
	type result struct {
		Balance float64
	}
	var res result
	query := `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END), 0) AS balance
		FROM ledger_entries
		WHERE account_id = ?
	`
	if err := r.db.WithContext(ctx).Raw(query, accountID).Scan(&res).Error; err != nil {
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
	query := `
		SELECT a.type, 
			COALESCE(SUM(CASE WHEN e.type = 'DEBIT' THEN e.amount ELSE -e.amount END), 0) AS balance
		FROM ledger_accounts a
		LEFT JOIN ledger_entries e ON e.account_id = a.id
		WHERE a.tenant_id = ?
		GROUP BY a.type
	`
	if err := r.db.WithContext(ctx).Raw(query, tenantID).Scan(&rows).Error; err != nil {
		return nil, err
	}
	balances := map[string]float64{}
	for _, r := range rows {
		balances[r.Type] = r.Balance
	}
	return balances, nil
}
