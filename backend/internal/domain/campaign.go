package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CampaignStatus represents the lifecycle of an email newsletter
type CampaignStatus string

const (
	CampaignStatusDraft   CampaignStatus = "DRAFT"
	CampaignStatusSending CampaignStatus = "SENDING"
	CampaignStatusSent    CampaignStatus = "SENT"
	CampaignStatusFailed  CampaignStatus = "FAILED"
)

// Campaign represents a newsletter or mass communication draft/deployment
type Campaign struct {
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	Subject   string         `json:"subject" gorm:"not null"`
	BodyHTML  string         `json:"body_html" gorm:"type:text;not null"`
	Target    string         `json:"target" gorm:"not null"` // e.g., "ALL_PARENTS", "GRADE_10", "ALUMNI"
	Status    CampaignStatus `json:"status" gorm:"type:varchar(20);default:'DRAFT'"`
	Creator   *User          `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	CreatorID uuid.UUID      `json:"creator_id" gorm:"type:uuid;not null"` // Which Admin wrote this
	TenantBase
}

func (c *Campaign) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// CampaignLog tracks individual email execution attempts to prevent double-sending
// and to establish read/delivery metrics later if needed.
type CampaignLog struct {
	CreatedAt  time.Time `json:"created_at"`
	Recipient  string    `json:"recipient" gorm:"not null"` // Target email address
	Status     string    `json:"status"`                    // "DELIVERED", "BOUNCED", "ERROR"
	Error      string    `json:"error,omitempty"`
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	CampaignID uuid.UUID `json:"campaign_id" gorm:"type:uuid;index"`
	TenantBase
}

func (cl *CampaignLog) BeforeCreate(tx *gorm.DB) (err error) {
	if cl.ID == uuid.Nil {
		cl.ID = uuid.New()
	}
	return
}

// CampaignRepository abstracts the persistence layer for mass communications
type CampaignRepository interface {
	Create(ctx context.Context, campaign *Campaign) error
	Update(ctx context.Context, campaign *Campaign) error
	GetByID(ctx context.Context, id uuid.UUID) (*Campaign, error)
	GetAll(ctx context.Context) ([]Campaign, error)
	Delete(ctx context.Context, id uuid.UUID) error
	LogAttempt(ctx context.Context, log *CampaignLog) error
}
