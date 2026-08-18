package usecase

import (
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
)

type notificationUseCase struct {
	hub *ws.Hub
}

func NewNotificationUseCase(hub *ws.Hub) domain.NotificationUseCase {
	return &notificationUseCase{hub: hub}
}

func (u *notificationUseCase) SendToUser(userID uuid.UUID, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	n.UserID = userID
	u.hub.Broadcast(n)
	return nil
}

func (u *notificationUseCase) SendToRole(role domain.Role, n domain.Notification) error {
	// Logic to find all users with that role would go here (requires UserRepo)
	// For simplicity, we broadcast and clients filter, or hub could handle role-based routing
	n.UserID = uuid.Nil // Global for now, filtering can be added to clients
	u.hub.Broadcast(n)
	return nil
}

func (u *notificationUseCase) Broadcast(n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	n.UserID = uuid.Nil
	u.hub.Broadcast(n)
	return nil
}
