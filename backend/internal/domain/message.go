package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Message represents a single chat message in a thread between two users
type Message struct {
	TenantBase
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ConversationID uuid.UUID  `json:"conversation_id" gorm:"type:uuid;index;not null"`
	SenderID       uuid.UUID  `json:"sender_id" gorm:"type:uuid;not null"`
	ParentID       *uuid.UUID `json:"parent_id,omitempty" gorm:"type:uuid;index"` // For message threading
	Content        string     `json:"content" gorm:"type:text;not null"`
	IsRead         bool       `json:"is_read" gorm:"default:false"`
	CreatedAt      time.Time `json:"created_at"`

	Sender *User `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}

// Conversation groups two participants into a secure direct-message thread
type Conversation struct {
	TenantBase
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ParticipantA uuid.UUID `json:"participant_a" gorm:"type:uuid;not null"` // e.g., Teacher UserID
	ParticipantB uuid.UUID `json:"participant_b" gorm:"type:uuid;not null"` // e.g., Guardian UserID
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Messages []Message `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
}

func (c *Conversation) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// MessageRepository abstracts persistence for in-app chat
type MessageRepository interface {
	FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*Conversation, error)
	GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]Conversation, error)
	GetMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	SendMessage(ctx context.Context, msg *Message) error
	MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error
}

type MessageUseCase interface {
	FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*Conversation, error)
	GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]Conversation, error)
	GetMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	SendMessage(ctx context.Context, msg *Message) error
	MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error
}
