package domain

import (
	"time"

	"github.com/google/uuid"
)

// Affiliate represents a sales agent or referring entity.
type Affiliate struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name           string    `json:"name" gorm:"type:varchar(255);not null"`
	Email          string    `json:"email" gorm:"type:varchar(255);uniqueIndex;not null"`
	Phone          string    `json:"phone" gorm:"type:varchar(50)"`
	CommissionRate float64   `json:"commission_rate" gorm:"default:0.10"` // e.g., 10%
	IsActive       bool      `json:"is_active" gorm:"default:true"`
	Notes          string    `json:"notes" gorm:"type:text"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Computed via JOIN — not stored
	Referrals    int     `json:"referrals" gorm:"-"`
	TotalEarned  float64 `json:"total_earned" gorm:"-"`
}

// AffiliateReferral maps a school to the affiliate who referred them.
type AffiliateReferral struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AffiliateID   uuid.UUID  `json:"affiliate_id" gorm:"type:uuid;not null;index"`
	TenantID      uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null;uniqueIndex"`
	CommissionPaid float64   `json:"commission_paid" gorm:"default:0"`
	PaidAt        *time.Time `json:"paid_at"`
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`

	Affiliate *Affiliate `json:"affiliate,omitempty" gorm:"foreignKey:AffiliateID"`
	Tenant    *Tenant    `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}
