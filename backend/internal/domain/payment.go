package domain

import (
	"time"

	"github.com/google/uuid"
)



// PaymentTransaction represents an attempt to pay a fiscal record (invoice)
type PaymentTransaction struct {
	ID             uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID       string         `json:"tenant_id" gorm:"type:varchar(255);not null;index"`
	FiscalRecordID *uuid.UUID     `json:"fiscal_record_id,omitempty" gorm:"type:uuid;index"`
	StudentID      *uuid.UUID     `json:"student_id,omitempty" gorm:"type:uuid;index"`
	PayerID        *uuid.UUID     `json:"payer_id,omitempty" gorm:"type:uuid;index"` // Guardian/User ID
	Amount         float64        `json:"amount" gorm:"not null"`
	Reference      string         `json:"reference" gorm:"type:varchar(255);uniqueIndex;not null"`
	Status         PaymentStatus  `json:"status" gorm:"type:varchar(50);not null;default:'PENDING'"`
	Provider       string         `json:"provider" gorm:"type:varchar(50);not null;default:'PAYSTACK'"`
	CreatedAt      time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time      `json:"updated_at" gorm:"autoUpdateTime"`

	// Relationships
	FiscalRecord *FiscalRecord `json:"fiscal_record,omitempty" gorm:"foreignKey:FiscalRecordID"`
	Payer        *User         `json:"payer,omitempty" gorm:"foreignKey:PayerID"`
}

// PaymentWebhookLog records raw incoming webhooks for debugging and idempotency
type PaymentWebhookLog struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID  string    `json:"tenant_id" gorm:"type:varchar(255);not null;index"`
	Provider  string    `json:"provider" gorm:"type:varchar(50);not null"`
	Event     string    `json:"event" gorm:"type:varchar(100);not null"`
	Payload   string    `json:"payload" gorm:"type:jsonb"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// PaymentRepository interface for interacting with payment data
type PaymentRepository interface {
	CreateTransaction(tx *PaymentTransaction) error
	GetTransactionByReference(tenantID, reference string) (*PaymentTransaction, error)
	GetTransactionByReferenceOnly(reference string) (*PaymentTransaction, error)
	UpdateTransactionStatus(tenantID, reference string, status PaymentStatus) error
	GetSubscriptionPaymentByReference(reference string) (*TenantSubscriptionPayment, error)
	UpdateSubscriptionPaymentStatus(reference string, status string) error
	LogWebhook(log *PaymentWebhookLog) error
}

type PaystackBank struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	Code     string `json:"code"`
	Longcode string `json:"longcode"`
	Gateway  string `json:"gateway"`
	Active   bool   `json:"active"`
	Country  string `json:"country"`
	Currency string `json:"currency"`
	Type     string `json:"type"`
}

type PaystackResolvedAccount struct {
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
	BankID        int    `json:"bank_id,omitempty"`
}

type PaystackCountry struct {
	Name         string `json:"name"`
	Code         string `json:"code"`
	Currency     string `json:"currency"`
	CurrencySign string `json:"currency_sign"`
}

// PaystackService defines external API interactions
type PaystackService interface {
	InitializeTransaction(email string, amount float64, reference string) (authorizationURL string, err error)
	VerifyWebhookSignature(payload []byte, signature string) bool
	CreateSubaccount(businessName, settlementBank, accountNumber string, percentageCharge float64) (string, error)
	VerifyTransaction(reference string) (status string, err error)

	// Bank Resolution and Subaccount features
	GetBanks(country string) ([]PaystackBank, error)
	ResolveAccount(accountNumber, bankCode string) (*PaystackResolvedAccount, error)
	InitializeTransactionWithOptions(email string, amount float64, reference string, secretKey string, subaccountCode string) (authorizationURL string, err error)

	// Tenant-specific overrides
	InitializeTransactionWithKey(email string, amount float64, reference string, secretKey string) (authorizationURL string, err error)
	VerifyWebhookSignatureWithKey(payload []byte, signature string, secretKey string) bool
}
