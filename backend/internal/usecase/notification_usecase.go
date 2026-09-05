package usecase

import (
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/internal/api/middleware"
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

func (u *notificationUseCase) getTenantSchemas() []string {
	if u.db == nil {
		return nil
	}
	var schemas []string
	_ = u.db.Raw("SELECT schema_name FROM public.tenants WHERE schema_name IS NOT NULL AND schema_name != ''").Pluck("schema_name", &schemas).Error
	return schemas
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
		// 1. Save into public.notifications
		_ = u.db.Table("public.notifications").Create(&n).Error

		// 2. Also save into tenant schemas where this user exists
		schemas := u.getTenantSchemas()
		for _, schema := range schemas {
			var count int64
			if err := u.db.Table(schema+".users").Where("id = ?", userID).Count(&count).Error; err == nil && count > 0 {
				_ = u.db.Table(schema+".notifications").Create(&n).Error
			}
		}
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

	if u.db != nil {
		// 1. Check public users
		var publicUserIDs []uuid.UUID
		_ = u.db.Table("public.users").Where("role = ?", role).Pluck("id", &publicUserIDs).Error
		for _, uid := range publicUserIDs {
			userNotif := n
			userNotif.ID = uuid.New()
			userNotif.UserID = uid
			_ = u.db.Table("public.notifications").Create(&userNotif).Error
			if u.hub != nil {
				u.hub.Broadcast(userNotif)
			}
		}

		// 2. Check all tenant schemas
		schemas := u.getTenantSchemas()
		for _, schema := range schemas {
			var tenantUserIDs []uuid.UUID
			if err := u.db.Table(schema+".users").Where("role = ?", role).Pluck("id", &tenantUserIDs).Error; err == nil {
				for _, uid := range tenantUserIDs {
					userNotif := n
					userNotif.ID = uuid.New()
					userNotif.UserID = uid
					_ = u.db.Table(schema+".notifications").Create(&userNotif).Error
					if u.hub != nil {
						u.hub.Broadcast(userNotif)
					}
				}
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

	if u.db != nil {
		// 1. Save into public.notifications
		_ = u.db.Table("public.notifications").Create(&n).Error

		// 2. Save into all tenant schemas
		schemas := u.getTenantSchemas()
		for _, schema := range schemas {
			_ = u.db.Table(schema+".notifications").Create(&n).Error
		}
	}

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
	_ = u.db.WithContext(ctx).
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).Error

	// Also check public.notifications
	var publicNotifs []domain.Notification
	_ = u.db.Table("public.notifications").
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Order("created_at DESC").
		Limit(limit).
		Find(&publicNotifs).Error

	// Also check if context has specific tenant schema
	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" && schema != "public" {
		var schemaNotifs []domain.Notification
		_ = u.db.Table(schema+".notifications").
			Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
			Order("created_at DESC").
			Limit(limit).
			Find(&schemaNotifs).Error
		notifications = append(notifications, schemaNotifs...)
	}

	// Merge & deduplicate by ID
	seen := make(map[uuid.UUID]bool)
	merged := make([]domain.Notification, 0, len(notifications)+len(publicNotifs))
	for _, n := range notifications {
		if !seen[n.ID] {
			seen[n.ID] = true
			merged = append(merged, n)
		}
	}
	for _, n := range publicNotifs {
		if !seen[n.ID] {
			seen[n.ID] = true
			merged = append(merged, n)
		}
	}

	// Sort merged by created_at DESC
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].CreatedAt.After(merged[j].CreatedAt)
	})

	if len(merged) > limit {
		merged = merged[:limit]
	}

	return merged, nil
}

func (u *notificationUseCase) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	if u.db == nil {
		return nil
	}
	_ = u.db.WithContext(ctx).
		Model(&domain.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id = ?)", id, userID, uuid.Nil).
		Update("read", true).Error

	_ = u.db.Table("public.notifications").
		Where("id = ? AND (user_id = ? OR user_id = ?)", id, userID, uuid.Nil).
		Update("read", true).Error

	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" && schema != "public" {
		_ = u.db.Table(schema+".notifications").
			Where("id = ? AND (user_id = ? OR user_id = ?)", id, userID, uuid.Nil).
			Update("read", true).Error
	}
	return nil
}

func (u *notificationUseCase) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	if u.db == nil {
		return nil
	}
	_ = u.db.WithContext(ctx).
		Model(&domain.Notification{}).
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Update("read", true).Error

	_ = u.db.Table("public.notifications").
		Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
		Update("read", true).Error

	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" && schema != "public" {
		_ = u.db.Table(schema+".notifications").
			Where("user_id = ? OR user_id = ?", userID, uuid.Nil).
			Update("read", true).Error
	}
	return nil
}
