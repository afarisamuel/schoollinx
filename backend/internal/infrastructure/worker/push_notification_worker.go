package worker

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/push"
	"gorm.io/gorm"
)

// PushNotificationWorker periodically fans out undelivered in-app notifications
// to each user's registered WebPush subscriptions across all active tenants.
//
// Flow:
//  1. Acquire distributed lock (prevents duplicate dispatch in multi-instance deployments).
//  2. Iterate every active tenant schema.
//  3. For each tenant, query notifications from the last 24h with pushed_at IS NULL.
//  4. For each notification, look up the user's push subscriptions and send.
//  5. Stamp pushed_at to prevent re-dispatch.
//  6. Rate-limit outbound WebPush calls to avoid gateway throttling.
type PushNotificationWorker struct {
	db       *gorm.DB
	locker   Locker
	webPush  push.WebPushService
	fcm      push.FCMService
	interval time.Duration
	rate     int
}

// NewPushNotificationWorker constructs the worker with both WebPush and FCM support.
// interval: polling frequency (default 30s).
// rate: max WebPush sends/second (default 10).
func NewPushNotificationWorker(
	db *gorm.DB,
	locker Locker,
	webPush push.WebPushService,
	fcm push.FCMService,
	interval time.Duration,
	rate int,
) *PushNotificationWorker {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	if rate <= 0 {
		rate = 10
	}
	return &PushNotificationWorker{
		db:       db,
		locker:   locker,
		webPush:  webPush,
		fcm:      fcm,
		interval: interval,
		rate:     rate,
	}
}

func (w *PushNotificationWorker) Name() string { return "PushNotificationWorker" }

func (w *PushNotificationWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	// Run once immediately so the first batch isn't delayed by the full interval.
	w.run(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.run(ctx)
		}
	}
}

func (w *PushNotificationWorker) run(ctx context.Context) {
	if w.webPush == nil || w.db == nil {
		return
	}

	// Distributed lock — 25s TTL (just under the 30s interval) so a slow run
	// on one instance never holds the lock into the next cycle on another.
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "push_notification_dispatch", 25*time.Second)
		if !acquired {
			return
		}
		defer release()
	}

	// Ensure pushed_at column exists in the public notifications table.
	// This is safe to run repeatedly — it's a no-op when the column already exists.
	_ = w.db.WithContext(ctx).
		Exec("ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ").Error

	// ── 1. Global (public) notifications ────────────────────────────────────
	w.dispatchForTable(ctx, "public.notifications", "/favicon.ico")

	// ── 2. Per-tenant notifications ─────────────────────────────────────────
	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).
		Table("public.tenants").
		Where("is_active = ?", true).
		Find(&tenants).Error; err != nil {
		log.Printf("[PushNotificationWorker] failed to load tenants: %v", err)
		return
	}

	for _, t := range tenants {
		if ctx.Err() != nil {
			return
		}
		tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, t.SchemaName)
		tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, t.ID)
		// Ensure the column exists in this tenant's notifications table too.
		_ = w.db.WithContext(tenantCtx).
			Exec(fmt.Sprintf("ALTER TABLE %s.notifications ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ", t.SchemaName)).Error
		
		tenantLogo := t.LogoURL
		if tenantLogo == "" {
			tenantLogo = "/favicon.ico"
		}
		w.dispatchForTable(tenantCtx, fmt.Sprintf("%s.notifications", t.SchemaName), tenantLogo)
	}
}

type pushSubRow struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	Endpoint string
	P256dh   string
	Auth     string
}

// dispatchForTable processes unsent push notifications from a specific table.
func (w *PushNotificationWorker) dispatchForTable(ctx context.Context, table string, logoURL string) {
	var notifications []domain.Notification

	if err := w.db.WithContext(ctx).
		Table(table).
		Where("pushed_at IS NULL AND created_at > ?", time.Now().Add(-24*time.Hour)).
		Order("created_at ASC").
		Limit(200).
		Find(&notifications).Error; err != nil {
		return // Column may not yet exist — silently skip.
	}

	if len(notifications) == 0 {
		return
	}

	// Collect unique user IDs.
	userIDSet := make(map[uuid.UUID]struct{})
	for _, n := range notifications {
		if n.UserID != uuid.Nil {
			userIDSet[n.UserID] = struct{}{}
		}
	}

	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	// Load push subscriptions from the public (global) schema.
	var rawSubs []pushSubRow
	if len(userIDs) > 0 {
		if err := w.db.WithContext(ctx).
			Table("public.push_subscriptions").
			Select("id, user_id, endpoint, p256dh, auth").
			Where("user_id IN ?", userIDs).
			Find(&rawSubs).Error; err != nil {
			log.Printf("[PushNotificationWorker] failed to load subscriptions for %s: %v", table, err)
		}
	}

	// Index subscriptions by user ID for O(1) lookup.
	subsByUser := make(map[uuid.UUID][]pushSubRow)
	for _, s := range rawSubs {
		subsByUser[s.UserID] = append(subsByUser[s.UserID], s)
	}

	// Load user notification preferences
	var rawPrefs []domain.NotificationPreference
	if len(userIDs) > 0 {
		_ = w.db.WithContext(ctx).
			Table("public.notification_preferences").
			Where("user_id IN ?", userIDs).
			Find(&rawPrefs).Error
	}
	prefByUser := make(map[uuid.UUID]*domain.NotificationPreference)
	for i := range rawPrefs {
		prefByUser[rawPrefs[i].UserID] = &rawPrefs[i]
	}

	rateLimiter := NewRateLimiter(w.rate)
	defer rateLimiter.Stop()

	for _, notif := range notifications {
		if ctx.Err() != nil {
			return
		}

		subs := subsByUser[notif.UserID]
		// No subscriptions — mark as dispatched so we don't re-query endlessly.
		if len(subs) == 0 {
			w.markPushed(ctx, table, notif.ID)
			continue
		}

		// Check user notification preferences & quiet hours
		if pref, exists := prefByUser[notif.UserID]; exists {
			if !isNotificationAllowed(pref, notif.Type) {
				w.markPushed(ctx, table, notif.ID)
				continue
			}
		}

		icon := logoURL
		if icon == "" {
			icon = "/favicon.ico"
		}

		payload := map[string]interface{}{
			"title":   notif.Title,
			"body":    notif.Message,
			"icon":    icon,
			"badge":   icon,
			"vibrate": []int{100, 50, 100},
			"actions": pushNotificationActions(notif.Type),
			"data": map[string]string{
				"id":       notif.ID.String(),
				"type":     string(notif.Type),
				"url":      pushTargetURL(notif.Type),
				"logo_url": icon,
			},
		}

		for _, s := range subs {
			if ctx.Err() != nil {
				return
			}
			if err := rateLimiter.Wait(ctx); err != nil {
				return
			}

			sub := &domain.PushSubscription{
				Endpoint: s.Endpoint,
				P256dh:   s.P256dh,
				Auth:     s.Auth,
			}
			sub.ID = s.ID
			sub.UserID = s.UserID

			var err error
			if (s.P256dh == "" || s.Auth == "") && w.fcm != nil && w.fcm.IsConfigured() {
				err = w.fcm.SendNotification(ctx, sub, payload)
			} else if w.webPush != nil {
				err = w.webPush.SendNotification(ctx, sub, payload)
			}

			if err != nil {
				if err.Error() == "subscription_expired" {
					_ = w.db.WithContext(ctx).
						Table("public.push_subscriptions").
						Where("endpoint = ?", s.Endpoint).
						Delete(&domain.PushSubscription{}).Error
				} else {
					log.Printf("[PushNotificationWorker] push failed user=%s: %v", s.UserID, err)
				}
			}
		}

		w.markPushed(ctx, table, notif.ID)
	}
}

// markPushed stamps pushed_at on a notification row.
func (w *PushNotificationWorker) markPushed(ctx context.Context, table string, id uuid.UUID) {
	_ = w.db.WithContext(ctx).
		Table(table).
		Where("id = ?", id).
		Update("pushed_at", time.Now()).Error
}

// isNotificationAllowed checks user preferences and quiet hours.
func isNotificationAllowed(pref *domain.NotificationPreference, notifType domain.NotificationType) bool {
	if pref == nil {
		return true
	}
	if pref.QuietHoursEnabled && pref.QuietHoursStart != "" && pref.QuietHoursEnd != "" {
		nowStr := time.Now().Format("15:04")
		if pref.QuietHoursStart < pref.QuietHoursEnd {
			if nowStr >= pref.QuietHoursStart && nowStr <= pref.QuietHoursEnd {
				return false
			}
		} else {
			if nowStr >= pref.QuietHoursStart || nowStr <= pref.QuietHoursEnd {
				return false
			}
		}
	}

	switch notifType {
	case domain.NotificationAttendance:
		return pref.AttendanceAlerts
	case domain.NotificationGrade, domain.NotificationExam:
		return pref.GradeAlerts
	case domain.NotificationPayment:
		return pref.PaymentAlerts
	case domain.NotificationMessage:
		return pref.MessageAlerts
	case domain.NotificationAnnouncement:
		return pref.AnnouncementAlerts
	case domain.NotificationWelfare:
		return pref.WelfareAlerts
	default:
		return true
	}
}

// pushNotificationActions returns interactive buttons for WebPush OS notifications.
func pushNotificationActions(t domain.NotificationType) []map[string]string {
	switch t {
	case domain.NotificationPayment:
		return []map[string]string{
			{"action": "/parents/payments", "title": "💳 Pay Now"},
			{"action": "/notifications", "title": "View Receipt"},
		}
	case domain.NotificationMessage:
		return []map[string]string{
			{"action": "/communications/messages", "title": "💬 Open Chat"},
		}
	case domain.NotificationAttendance:
		return []map[string]string{
			{"action": "/parents/academics", "title": "📊 Attendance"},
		}
	case domain.NotificationGrade, domain.NotificationExam:
		return []map[string]string{
			{"action": "/parents/academics", "title": "📝 View Grades"},
		}
	default:
		return []map[string]string{
			{"action": "/notifications", "title": "🔔 View Alert"},
		}
	}
}

// pushTargetURL returns the in-app deep-link path for a notification type.
func pushTargetURL(t domain.NotificationType) string {
	switch t {
	case domain.NotificationAttendance:
		return "/parents/academics"
	case domain.NotificationPayment:
		return "/parents/payments"
	case domain.NotificationMessage:
		return "/communications/messages"
	case domain.NotificationGrade, domain.NotificationExam:
		return "/parents/academics"
	case domain.NotificationWelfare:
		return "/parents/overview"
	case domain.NotificationAnnouncement:
		return "/notifications"
	default:
		return "/notifications"
	}
}
