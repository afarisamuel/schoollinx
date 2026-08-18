package domain

import (
	"time"

	"github.com/google/uuid"
)

type SmsLedgerDirection string

const (
	SmsLedgerDirectionCredit SmsLedgerDirection = "CREDIT"
	SmsLedgerDirectionDebit  SmsLedgerDirection = "DEBIT"
)

// SmsLedger tracks all SMS credits added or consumed across the platform globally.
type SmsLedger struct {
	ID           uuid.UUID          `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID     uuid.UUID          `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Direction    SmsLedgerDirection `json:"direction" gorm:"type:varchar(20);not null"`
	Amount       int                `json:"amount" gorm:"not null"` // Number of credits
	ProviderCost float64            `json:"provider_cost" gorm:"default:0"` // Optional: actual cost charged by Hubtel/Twilio
	Description  string             `json:"description" gorm:"type:text;not null"`
	CreatedAt    time.Time          `json:"created_at" gorm:"autoCreateTime;index"`
	
	Tenant       *Tenant            `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}
