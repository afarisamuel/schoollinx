package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type messageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) domain.MessageRepository {
	return &messageRepository{db: db}
}

// FindOrCreateConversation retrieves an existing thread or starts a new one.
// It normalizes direction (A, B) vs (B, A) so duplicates are never created.
func (r *messageRepository) FindOrCreateConversation(ctx context.Context, a, b uuid.UUID) (*domain.Conversation, error) {
	var conv domain.Conversation
	// Check both directions
	err := r.db.WithContext(ctx).
		Where("(participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?)", a, b, b, a).
		First(&conv).Error

	if err == gorm.ErrRecordNotFound {
		conv = domain.Conversation{ParticipantA: a, ParticipantB: b}
		if createErr := r.db.WithContext(ctx).Create(&conv).Error; createErr != nil {
			return nil, createErr
		}
		return &conv, nil
	}
	return &conv, err
}

func (r *messageRepository) GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]domain.Conversation, error) {
	var convs []domain.Conversation
	err := r.db.WithContext(ctx).
		Where("participant_a = ? OR participant_b = ?", userID, userID).
		Order("updated_at DESC").
		Find(&convs).Error
	return convs, err
}

func (r *messageRepository) GetMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Find(&messages).Error
	return messages, err
}

func (r *messageRepository) SendMessage(ctx context.Context, msg *domain.Message) error {
	if err := r.db.WithContext(ctx).Create(msg).Error; err != nil {
		return err
	}
	// Update conversation's updated_at so latest threads sort to top
	return r.db.WithContext(ctx).Model(&domain.Conversation{}).
		Where("id = ?", msg.ConversationID).
		Update("updated_at", msg.CreatedAt).Error
}

func (r *messageRepository) MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = false", conversationID, readerID).
		Update("is_read", true).Error
}
