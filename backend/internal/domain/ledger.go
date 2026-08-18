package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AccountType string

const (
	AccountTypeAsset     AccountType = "ASSET"
	AccountTypeLiability AccountType = "LIABILITY"
	AccountTypeEquity    AccountType = "EQUITY"
	AccountTypeRevenue   AccountType = "REVENUE"
	AccountTypeExpense   AccountType = "EXPENSE"
)

type LedgerAccount struct {
	ID          uuid.UUID   `json:"id"`
	TenantID    uuid.UUID   `json:"tenant_id"`
	Code        string      `json:"code"`
	Name        string      `json:"name"`
	Type        AccountType `json:"type"`
	Description string      `json:"description"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type EntryType string

const (
	EntryTypeDebit  EntryType = "DEBIT"
	EntryTypeCredit EntryType = "CREDIT"
)

type LedgerEntry struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	AccountID   uuid.UUID `json:"account_id"`
	Type        EntryType `json:"type"`
	Amount      float64   `json:"amount"`
	Reference   string    `json:"reference"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	CreatedAt   time.Time `json:"created_at"`
}

type LedgerRepository interface {
	CreateAccount(ctx context.Context, account *LedgerAccount) error
	GetAccountByID(ctx context.Context, id uuid.UUID) (*LedgerAccount, error)
	ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]*LedgerAccount, error)

	PostEntry(ctx context.Context, entry *LedgerEntry) error
	ListEntriesByAccount(ctx context.Context, accountID uuid.UUID) ([]*LedgerEntry, error)
	GetAccountBalance(ctx context.Context, accountID uuid.UUID) (float64, error)
	GetBalanceSheet(ctx context.Context, tenantID uuid.UUID) (map[string]float64, error)
}
