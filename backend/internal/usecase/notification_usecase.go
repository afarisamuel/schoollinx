package usecase

import (
	"context"
	"fmt"
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
	fcm      push.FCMService
}

func NewNotificationUseCase(hub *ws.Hub, db *gorm.DB, pushRepo domain.PushSubscriptionRepository, webPush push.WebPushService, fcm ...push.FCMService) domain.NotificationUseCase {
	uc := &notificationUseCase{
		hub:      hub,
		db:       db,
		pushRepo: pushRepo,
		webPush:  webPush,
	}
	if len(fcm) > 0 {
		uc.fcm = fcm[0]
	}
	return uc
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
	tenantID, _ := middleware.GetTenantIDFromContext(ctx)
	if u.hub != nil {
		u.hub.SendToUserWithTenant(schema, userID, n)
	}

	// Dispatch instant push notification in background
	if u.pushRepo != nil && (u.webPush != nil || (u.fcm != nil && u.fcm.IsConfigured())) {
		bgCtx := context.Background()
		if schema != "" {
			bgCtx = context.WithValue(bgCtx, middleware.TenantSchemaKey, schema)
		}
		if tenantID != uuid.Nil {
			bgCtx = context.WithValue(bgCtx, middleware.TenantIDKey, tenantID)
		}
		go func(targetUID uuid.UUID, notif domain.Notification) {
			_ = u.SendPushNotification(bgCtx, targetUID, notif.Title, notif.Message, "/favicon.ico", "/notifications")
			if u.db != nil {
				now := time.Now()
				_ = u.db.WithContext(bgCtx).Table("public.notifications").Where("id = ?", notif.ID).Update("pushed_at", &now).Error
			}
		}(userID, n)
	}

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
			for _, uid := range userIDs {
				userNotif := n
				userNotif.ID = uuid.New()
				_ = u.SendToUser(ctx, uid, userNotif)
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

func (u *notificationUseCase) GetUserSubscriptions(ctx context.Context, userID uuid.UUID) ([]domain.PushSubscription, error) {
	if u.pushRepo == nil {
		return []domain.PushSubscription{}, nil
	}
	return u.pushRepo.GetByUserID(ctx, userID)
}

func (u *notificationUseCase) DeleteSubscription(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	if u.pushRepo == nil {
		return nil
	}
	return u.pushRepo.DeleteByID(ctx, id, userID)
}

func (u *notificationUseCase) GetPreferences(ctx context.Context, userID uuid.UUID) (*domain.NotificationPreference, error) {
	if u.pushRepo == nil {
		return &domain.NotificationPreference{
			UserID:             userID,
			AttendanceAlerts:   true,
			GradeAlerts:        true,
			PaymentAlerts:      true,
			MessageAlerts:      true,
			AnnouncementAlerts: true,
			WelfareAlerts:      true,
			QuietHoursEnabled:  false,
			QuietHoursStart:    "21:00",
			QuietHoursEnd:      "06:30",
		}, nil
	}
	return u.pushRepo.GetPreferences(ctx, userID)
}

func (u *notificationUseCase) UpdatePreferences(ctx context.Context, pref *domain.NotificationPreference) error {
	if u.pushRepo == nil {
		return nil
	}
	return u.pushRepo.UpsertPreferences(ctx, pref)
}

func (u *notificationUseCase) SendPushNotification(ctx context.Context, userID uuid.UUID, title, body, icon, url string) error {
	if u.pushRepo == nil || (u.webPush == nil && (u.fcm == nil || !u.fcm.IsConfigured())) {
		return fmt.Errorf("push notification service not configured")
	}

	subs, err := u.pushRepo.GetByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to load push subscriptions: %w", err)
	}
	if len(subs) == 0 {
		return fmt.Errorf("no active push subscription found for your account — please enable push notifications on this device first")
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

	var lastErr error
	successCount := 0
	for _, sub := range subs {
		var sendErr error
		if (sub.P256dh == "" || sub.Auth == "") && u.fcm != nil && u.fcm.IsConfigured() {
			sendErr = u.fcm.SendNotification(ctx, &sub, payload)
		} else if u.webPush != nil {
			sendErr = u.webPush.SendNotification(ctx, &sub, payload)
		}

		if sendErr != nil {
			lastErr = sendErr
			if sendErr.Error() == "subscription_expired" {
				_ = u.pushRepo.DeleteByEndpoint(ctx, sub.Endpoint)
			}
		} else {
			successCount++
		}
	}

	if successCount == 0 && lastErr != nil {
		return fmt.Errorf("push dispatch failed: %w", lastErr)
	}

	return nil
}
