package domain

import (
	"time"

	"github.com/google/uuid"
)

type SenderIDRequestStatus string

const (
	SenderIDStatusPending  SenderIDRequestStatus = "PENDING"
	SenderIDStatusApproved SenderIDRequestStatus = "APPROVED"
	SenderIDStatusRejected SenderIDRequestStatus = "REJECTED"
)

// SenderIDRequest represents a school's application for a verified SMS Sender ID.
type SenderIDRequest struct {
	ID         uuid.UUID             `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID   uuid.UUID             `json:"tenant_id" gorm:"type:uuid;not null;index"`
	SenderID   string                `json:"sender_id" gorm:"type:varchar(11);not null"`
	Purpose    string                `json:"purpose" gorm:"type:text"`
	Status     SenderIDRequestStatus `json:"status" gorm:"type:varchar(20);not null;default:'PENDING'"`
	AdminNotes string                `json:"admin_notes" gorm:"type:text"`
	ReviewedBy *uuid.UUID            `json:"reviewed_by" gorm:"type:uuid"`
	ReviewedAt *time.Time            `json:"reviewed_at"`
	CreatedAt  time.Time             `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt  time.Time             `json:"updated_at" gorm:"autoUpdateTime"`

	Tenant     *Tenant               `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}

// SMSTopUpPayment tracks tenant on-demand top-up payments converted into SMS credits.
type SMSTopUpPayment struct {
	ID               uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID         uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Amount           float64   `json:"amount" gorm:"not null"` // Amount in GHS (e.g. 50.00)
	RatePerSMS       float64   `json:"rate_per_sms" gorm:"not null"` // Unit cost at time of purchase (e.g. 0.05)
	CreditsPurchased int       `json:"credits_purchased" gorm:"not null"` // Converted number of SMS credits (e.g. 1000)
	Reference        string    `json:"reference" gorm:"type:varchar(255);uniqueIndex;not null"`
	Status           string    `json:"status" gorm:"type:varchar(50);not null;default:'PENDING'"` // PENDING, SUCCESS, FAILED
	Provider         string    `json:"provider" gorm:"type:varchar(50);not null;default:'PAYSTACK'"`
	PayerEmail       string    `json:"payer_email" gorm:"type:varchar(255)"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Tenant           *Tenant   `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}
