package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NewsletterSubscriber represents a parent/guardian opted in for newsletters
type NewsletterSubscriber struct {
	TenantBase
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	GuardianID uuid.UUID `json:"guardian_id" gorm:"type:uuid;not null;uniqueIndex:idx_tenant_guardian_newsletter"`
	Email      string    `json:"email" gorm:"not null"`
	Frequency  string    `json:"frequency" gorm:"default:'WEEKLY'"` // WEEKLY, MONTHLY
	IsActive   bool      `json:"is_active" gorm:"default:true"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (s *NewsletterSubscriber) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// Newsletter represents a generated newsletter
type Newsletter struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Content     string    `json:"content" gorm:"not null"` // HTML content
	SentAt      time.Time `json:"sent_at"`
	Status      string    `json:"status" gorm:"default:'DRAFT'"` // DRAFT, SENT, FAILED
	Audience    string    `json:"audience" gorm:"default:'ALL'"` // ALL, SPECIFIC_CLASS
	SentCount   int       `json:"sent_count" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (n *Newsletter) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

type NewsletterRepository interface {
	Subscribe(ctx context.Context, sub *NewsletterSubscriber) error
	Unsubscribe(ctx context.Context, guardianID uuid.UUID) error
	GetSubscribers(ctx context.Context) ([]NewsletterSubscriber, error)
	GetSubscriberByGuardian(ctx context.Context, guardianID uuid.UUID) (*NewsletterSubscriber, error)

	SaveNewsletter(ctx context.Context, n *Newsletter) error
	GetNewsletters(ctx context.Context) ([]Newsletter, error)
	GetNewsletterByID(ctx context.Context, id uuid.UUID) (*Newsletter, error)
}

type NewsletterUseCase interface {
	Subscribe(ctx context.Context, guardianID uuid.UUID, email string, frequency string) error
	Unsubscribe(ctx context.Context, guardianID uuid.UUID) error
	GetSubscriberByGuardian(ctx context.Context, guardianID uuid.UUID) (*NewsletterSubscriber, error)
	
	GenerateWeeklyNewsletter(ctx context.Context) (*Newsletter, error)
	CreateCustomNewsletter(ctx context.Context, title, content, audience string) (*Newsletter, error)
	SendNewsletter(ctx context.Context, id uuid.UUID) error
	GetNewsletters(ctx context.Context) ([]Newsletter, error)
}
