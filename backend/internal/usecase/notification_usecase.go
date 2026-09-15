package usecase

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/push"
)

type notificationUseCase struct {
	hub      *ws.Hub
	db       *gorm.DB
	pushRepo domain.PushSubscriptionRepository
	webPush  push.WebPushService
}

func NewNotificationUseCase(hub *ws.Hub, db *gorm.DB, pushRepo domain.PushSubscriptionRepository, webPush push.WebPushService) domain.NotificationUseCase {
	return &notificationUseCase{
		hub:      hub,
		db:       db,
		pushRepo: pushRepo,
		webPush:  webPush,
	}
}

func (u *notificationUseCase) dispatchWebPush(ctx context.Context, userID uuid.UUID, title, message string, data map[string]interface{}) {
	if u.webPush == nil || u.pushRepo == nil || userID == uuid.Nil {
		return
	}

	// Create detached context preserving tenant schema & ID for background push dispatch
	bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" {
		bgCtx = context.WithValue(bgCtx, middleware.TenantSchemaKey, schema)
	}
	if tID, ok := middleware.GetTenantIDFromContext(ctx); ok && tID != uuid.Nil {
		bgCtx = context.WithValue(bgCtx, middleware.TenantIDKey, tID)
	}

	go func() {
		defer cancel()

		subs, err := u.pushRepo.GetByUserID(bgCtx, userID)
		if err != nil || len(subs) == 0 {
			return
		}

		payload := map[string]interface{}{
			"title":   title,
			"body":    message,
			"icon":    "/favicon.ico",
			"badge":   "/favicon.ico",
			"data":    data,
			"vibrate": []int{100, 50, 100},
		}

		for _, sub := range subs {
			err := u.webPush.SendNotification(bgCtx, &sub, payload)
			if err != nil {
				if err.Error() == "subscription_expired" {
					_ = u.pushRepo.DeleteByEndpoint(bgCtx, sub.Endpoint)
				} else {
					log.Printf("WARN: Web push notification failed for user %s: %v", userID, err)
				}
			}
		}
	}()
}

func (u *notificationUseCase) SendToUser(ctx context.Context, userID uuid.UUID, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	n.UserID = userID

	if u.db != nil && userID != uuid.Nil {
		_ = u.db.WithContext(ctx).Create(&n).Error
	}

	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	if u.hub != nil {
		u.hub.SendToUserWithTenant(schema, userID, n)
	}

	u.dispatchWebPush(ctx, userID, n.Title, n.Message, map[string]interface{}{
		"id":   n.ID.String(),
		"type": string(n.Type),
	})

	return nil
}

func (u *notificationUseCase) SendToRole(ctx context.Context, role domain.Role, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}

	if u.db != nil {
		var userIDs []uuid.UUID
		if err := u.db.WithContext(ctx).Model(&domain.User{}).Where("role = ?", role).Pluck("id", &userIDs).Error; err == nil {
			schema, _ := middleware.GetTenantSchemaFromContext(ctx)
			for _, uid := range userIDs {
				userNotif := n
				userNotif.ID = uuid.New()
				userNotif.UserID = uid
				_ = u.db.WithContext(ctx).Create(&userNotif).Error
				if u.hub != nil {
					u.hub.SendToUserWithTenant(schema, uid, userNotif)
				}
			}
		}
	}

	return nil
}

func (u *notificationUseCase) Broadcast(ctx context.Context, n domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	n.UserID = uuid.Nil

	if u.db != nil {
		_ = u.db.WithContext(ctx).Create(&n).Error
	}

	schema, _ := middleware.GetTenantSchemaFromContext(ctx)
	if u.hub != nil {
		u.hub.BroadcastWithTenant(schema, n)
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

func (u *notificationUseCase) SubscribePush(ctx context.Context, sub *domain.PushSubscription) error {
	if u.pushRepo == nil {
		return nil
	}
	return u.pushRepo.Upsert(ctx, sub)
}

func (u *notificationUseCase) UnsubscribePush(ctx context.Context, endpoint string) error {
	if u.pushRepo == nil {
		return nil
	}
	return u.pushRepo.DeleteByEndpoint(ctx, endpoint)
}

func (u *notificationUseCase) SendPushNotification(ctx context.Context, userID uuid.UUID, title, body, icon, url string) error {
	if u.pushRepo == nil || u.webPush == nil {
		return nil
	}

	subs, err := u.pushRepo.GetByUserID(ctx, userID)
	if err != nil || len(subs) == 0 {
		return nil
	}

	if icon == "" {
		icon = "/favicon.ico"
	}

	payload := map[string]interface{}{
		"title":   title,
		"body":    body,
		"icon":    icon,
		"badge":   icon,
		"data":    map[string]string{"url": url},
		"vibrate": []int{100, 50, 100},
	}

	for _, sub := range subs {
		if err := u.webPush.SendNotification(ctx, &sub, payload); err != nil {
			if err.Error() == "subscription_expired" {
				_ = u.pushRepo.DeleteByEndpoint(ctx, sub.Endpoint)
			}
		}
	}

	return nil
}
