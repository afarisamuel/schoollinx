package domain

import (
	"time"

	"github.com/google/uuid"
)

// TenantSubscriptionPayment records a payment made by a school (tenant) to the platform for their subscription.
type TenantSubscriptionPayment struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID     uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Amount       float64   `json:"amount" gorm:"not null"`
	StudentCount int       `json:"student_count" gorm:"not null"`
	Reference    string    `json:"reference" gorm:"type:varchar(255);uniqueIndex;not null"`
	Status       string    `json:"status" gorm:"type:varchar(50);not null;default:'PENDING'"`
	Provider     string    `json:"provider" gorm:"type:varchar(50);not null;default:'PAYSTACK'"`
	PayerEmail   string    `json:"payer_email" gorm:"type:varchar(255);not null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relationships
	Tenant *Tenant `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}
