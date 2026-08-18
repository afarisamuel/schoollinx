package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SystemAnnouncement struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Title     string         `json:"title" binding:"required"`
	Content   string         `json:"content" binding:"required"`
	Priority  string         `json:"priority" gorm:"default:'INFO'"` // INFO, WARNING, CRITICAL
	IsActive  bool           `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type TicketStatus string
type TicketPriority string

const (
	TicketStatusOpen       TicketStatus = "OPEN"
	TicketStatusInProgress TicketStatus = "IN_PROGRESS"
	TicketStatusResolved   TicketStatus = "RESOLVED"

	TicketPriorityLow    TicketPriority = "LOW"
	TicketPriorityMedium TicketPriority = "MEDIUM"
	TicketPriorityHigh   TicketPriority = "HIGH"
	TicketPriorityUrgent TicketPriority = "URGENT"
)

// SystemConfig stores global boolean flags for service degradation toggles.
type SystemConfig struct {
	Key       string    `json:"key" gorm:"type:varchar(50);primaryKey"`
	Value     string    `json:"value" gorm:"type:text;not null"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// SupportTicket represents a helpdesk ticket opened by a Tenant.
type SupportTicket struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID    uuid.UUID      `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Subject     string         `json:"subject" gorm:"type:varchar(255);not null"`
	Description string         `json:"description" gorm:"type:text;not null"`
	Status      TicketStatus   `json:"status" gorm:"type:varchar(20);default:'OPEN'"`
	Priority    TicketPriority `json:"priority" gorm:"type:varchar(20);default:'MEDIUM'"`
	CreatedAt   time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	
	Tenant      *Tenant        `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}

// ContactSubmission represents a message submitted via the public contact form.
type ContactSubmission struct {
	ID         string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FullName   string    `json:"full_name" gorm:"type:varchar(255);not null"`
	WorkEmail  string    `json:"work_email" gorm:"type:varchar(255);not null"`
	SchoolName string    `json:"school_name" gorm:"type:varchar(255);not null"`
	Message    string    `json:"message" gorm:"type:text"`
	Status     string    `json:"status" gorm:"type:varchar(20);default:'UNREAD'"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// SystemSecurityIP represents a whitelisted IP address for the admin panel or API.
type SystemSecurityIP struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	IPAddress   string    `json:"ip_address" gorm:"type:varchar(50);uniqueIndex;not null"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	AddedBy     string    `json:"added_by" gorm:"type:varchar(255)"` // e.g., admin email
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}
