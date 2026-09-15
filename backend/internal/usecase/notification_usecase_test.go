package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

func setupTestNotificationDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	assert.NoError(t, err)

	// Create tables compatible with SQLite
	err = db.Exec(`CREATE TABLE IF NOT EXISTS notifications (
		id TEXT PRIMARY KEY,
		deleted_at DATETIME,
		user_id TEXT NOT NULL,
		type TEXT NOT NULL,
		title TEXT NOT NULL,
		message TEXT NOT NULL,
		read BOOLEAN DEFAULT 0,
		created_at DATETIME,
		data JSON
	)`).Error
	assert.NoError(t, err)

	err = db.Exec(`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		deleted_at DATETIME,
		role TEXT,
		email TEXT,
		created_at DATETIME
	)`).Error
	assert.NoError(t, err)

	return db
}

func TestNotificationUseCase_TenantIsolation_SendToUser(t *testing.T) {
	db := setupTestNotificationDB(t)
	hub := ws.NewHub("")
	uc := usecase.NewNotificationUseCase(hub, db, nil, nil)

	userTenantA := uuid.New()
	userTenantB := uuid.New()

	ctxA := context.WithValue(context.Background(), middleware.TenantSchemaKey, "tenant_a")
	ctxB := context.WithValue(context.Background(), middleware.TenantSchemaKey, "tenant_b")

	// 1. Send notification in Tenant A context
	notifA := domain.Notification{
		Type:      domain.NotificationPayment,
		Title:     "School Fees Paid (School A)",
		Message:   "Payment of GHS 500 received for John Doe",
		CreatedAt: time.Now(),
	}
	err := uc.SendToUser(ctxA, userTenantA, notifA)
	assert.NoError(t, err)

	// 2. Fetch notifications for Tenant A user
	notifsA, err := uc.GetNotificationsForUser(ctxA, userTenantA, 10)
	assert.NoError(t, err)
	assert.Len(t, notifsA, 1)
	assert.Equal(t, "School Fees Paid (School A)", notifsA[0].Title)

	// 3. Fetch notifications for Tenant B user - MUST be empty
	notifsB, err := uc.GetNotificationsForUser(ctxB, userTenantB, 10)
	assert.NoError(t, err)
	assert.Len(t, notifsB, 0, "Tenant B user MUST NOT see Tenant A notifications")
}

func TestNotificationUseCase_TenantIsolation_SendToRole(t *testing.T) {
	db := setupTestNotificationDB(t)
	hub := ws.NewHub("")
	uc := usecase.NewNotificationUseCase(hub, db, nil, nil)

	adminA := domain.User{
		ID:    uuid.New(),
		Role:  domain.RoleAdmin,
		Email: "admin@schoola.com",
	}
	adminB := domain.User{
		ID:    uuid.New(),
		Role:  domain.RoleAdmin,
		Email: "admin@schoolb.com",
	}

	err := db.Exec("INSERT INTO users (id, role, email) VALUES (?, ?, ?)", adminA.ID.String(), string(domain.RoleAdmin), "admin@schoola.com").Error
	assert.NoError(t, err)
	err = db.Exec("INSERT INTO users (id, role, email) VALUES (?, ?, ?)", adminB.ID.String(), string(domain.RoleAdmin), "admin@schoolb.com").Error
	assert.NoError(t, err)

	ctxA := context.WithValue(context.Background(), middleware.TenantSchemaKey, "tenant_a")

	notif := domain.Notification{
		Type:    domain.NotificationPayment,
		Title:   "Fee Receipt",
		Message: "GHS 1000 collected",
	}

	err = uc.SendToRole(ctxA, domain.RoleAdmin, notif)
	assert.NoError(t, err)

	// Admin A in Tenant A should be able to get their notification
	notifsA, err := uc.GetNotificationsForUser(ctxA, adminA.ID, 10)
	assert.NoError(t, err)
	assert.Len(t, notifsA, 1)
	assert.Equal(t, "Fee Receipt", notifsA[0].Title)
}

func TestNotificationUseCase_TenantIsolation_MarkAsRead(t *testing.T) {
	db := setupTestNotificationDB(t)
	hub := ws.NewHub("")
	uc := usecase.NewNotificationUseCase(hub, db, nil, nil)

	userA := uuid.New()
	ctxA := context.WithValue(context.Background(), middleware.TenantSchemaKey, "tenant_a")

	notif := domain.Notification{
		Type:    domain.NotificationSystem,
		Title:   "Notice",
		Message: "School will close early today",
	}
	err := uc.SendToUser(ctxA, userA, notif)
	assert.NoError(t, err)

	notifs, err := uc.GetNotificationsForUser(ctxA, userA, 10)
	assert.NoError(t, err)
	assert.Len(t, notifs, 1)
	assert.False(t, notifs[0].Read)

	// Mark as read
	err = uc.MarkAsRead(ctxA, notifs[0].ID, userA)
	assert.NoError(t, err)

	notifsUpdated, err := uc.GetNotificationsForUser(ctxA, userA, 10)
	assert.NoError(t, err)
	assert.Len(t, notifsUpdated, 1)
	assert.True(t, notifsUpdated[0].Read)
}
