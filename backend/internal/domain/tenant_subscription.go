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

// TenantSubscriptionSummary represents the real-time billing and student delta subscription status of a school.
type TenantSubscriptionSummary struct {
	TotalStudents      int        `json:"total_students"`
	PaidStudentCount   int        `json:"paid_student_count"`
	UnpaidStudentCount int        `json:"unpaid_student_count"`
	PerStudentRate     float64    `json:"per_student_rate"`
	TotalDue           float64    `json:"total_due"`
	TotalTermCost      float64    `json:"total_term_cost"`
	BillingDueDate     *time.Time `json:"billing_due_date"`
	Status             string     `json:"status"` // 'ACTIVE', 'PARTIAL', 'OVERDUE', 'PENDING'
	IsFullyCovered     bool       `json:"is_fully_covered"`
	LatestPayment      *TenantSubscriptionPayment `json:"latest_payment,omitempty"`
}

