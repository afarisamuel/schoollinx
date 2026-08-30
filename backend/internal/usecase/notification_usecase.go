package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
)

type notificationUseCase struct {
	hub *ws.Hub
	db  *gorm.DB
}

func NewNotificationUseCase(hub *ws.Hub, db ...*gorm.DB) domain.NotificationUseCase {
	uc := &notificationUseCase{hub: hub}
	if len(db) > 0 && db[0] != nil {
		uc.db = db[0]
	}
	return uc
}

func (u *notificationUseCase) SendToUser(userID uuid.UUID, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	n.UserID = userID

	if u.db != nil && userID != uuid.Nil {
		_ = u.db.Create(&n).Error
	}

	if u.hub != nil {
		u.hub.Broadcast(n)
	}
	return nil
}

func (u *notificationUseCase) SendToRole(role domain.Role, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}

	// Persist notifications for users with that role
	if u.db != nil {
		var userIDs []uuid.UUID
		_ = u.db.Raw("SELECT id FROM public.users WHERE role = ? UNION SELECT id FROM users WHERE role = ?", role, role).Scan(&userIDs).Error
		for _, uid := range userIDs {
			userNotif := n
			userNotif.ID = uuid.New()
			userNotif.UserID = uid
			_ = u.db.Create(&userNotif).Error
			if u.hub != nil {
				u.hub.Broadcast(userNotif)
			}
		}
	}

	// Broadcast globally on WebSocket
	n.UserID = uuid.Nil
	if u.hub != nil {
		u.hub.Broadcast(n)
	}
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

	if u.hub != nil {
		u.hub.Broadcast(n)
	}
	return nil
}

func (u *notificationUseCase) GetNotificationsForUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Notification, error) {
	if u.db == nil {
		return []domain.Notification{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var notifications []domain.Notification
	err := u.db.WithContext(ctx).
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return []domain.Notification{}, err
	}
	return notifications, nil
}

func (u *notificationUseCase) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	if u.db == nil {
		return nil
	}
	return u.db.WithContext(ctx).
		Model(&domain.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id = ?)", id, userID, uuid.Nil).
		Update("read", true).Error
}

func (u *notificationUseCase) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	if u.db == nil {
		return nil
	}
	return u.db.WithContext(ctx).
		Model(&domain.Notification{}).
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Update("read", true).Error
}

