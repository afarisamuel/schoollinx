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
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID   `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Code        string      `json:"code" gorm:"size:50;not null"`
	Name        string      `json:"name" gorm:"size:255;not null"`
	Type        AccountType `json:"type" gorm:"size:50;not null"`
	Description string      `json:"description"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

func (LedgerAccount) TableName() string { return "ledger_accounts" }

type EntryType string

const (
	EntryTypeDebit  EntryType = "DEBIT"
	EntryTypeCredit EntryType = "CREDIT"
)

type LedgerEntry struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	AccountID   uuid.UUID `json:"account_id" gorm:"type:uuid;not null;index"`
	Type        EntryType `json:"type" gorm:"size:10;not null"`
	Amount      float64   `json:"amount" gorm:"type:decimal(15,2)"`
	Reference   string    `json:"reference" gorm:"size:255"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	CreatedAt   time.Time `json:"created_at"`
}

func (LedgerEntry) TableName() string { return "ledger_entries" }

type LedgerRepository interface {
	CreateAccount(ctx context.Context, account *LedgerAccount) error
	GetAccountByID(ctx context.Context, id uuid.UUID) (*LedgerAccount, error)
	ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]*LedgerAccount, error)

	PostEntry(ctx context.Context, entry *LedgerEntry) error
	ListEntriesByAccount(ctx context.Context, accountID uuid.UUID) ([]*LedgerEntry, error)
	GetAccountBalance(ctx context.Context, accountID uuid.UUID) (float64, error)
	GetBalanceSheet(ctx context.Context, tenantID uuid.UUID) (map[string]float64, error)
}
