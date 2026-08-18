package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type messageUseCase struct {
	repo domain.MessageRepository
}

func NewMessageUseCase(repo domain.MessageRepository) domain.MessageUseCase {
	return &messageUseCase{repo: repo}
}

func (u *messageUseCase) FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*domain.Conversation, error) {
	return u.repo.FindOrCreateConversation(ctx, participantA, participantB)
}

func (u *messageUseCase) GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]domain.Conversation, error) {
	return u.repo.GetConversationsByUser(ctx, userID)
}

func (u *messageUseCase) GetMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	return u.repo.GetMessages(ctx, conversationID)
}

func (u *messageUseCase) SendMessage(ctx context.Context, msg *domain.Message) error {
	return u.repo.SendMessage(ctx, msg)
}

func (u *messageUseCase) MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error {
	return u.repo.MarkAsRead(ctx, conversationID, readerID)
}
