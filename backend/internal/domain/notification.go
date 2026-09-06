package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type NotificationType string

const (
	NotificationAttendance NotificationType = "ATTENDANCE"
	NotificationGrade      NotificationType = "GRADE"
	NotificationSystem     NotificationType = "SYSTEM"
	NotificationPayment    NotificationType = "PAYMENT"
)

type Notification struct {
	TenantBase
	ID        uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID        `json:"user_id" gorm:"type:uuid;index;not null"`
	Type      NotificationType `json:"type" gorm:"type:varchar(50);not null"`
	Title     string           `json:"title" gorm:"not null"`
	Message   string           `json:"message" gorm:"not null"`
	Read      bool             `json:"read" gorm:"default:false"`
	CreatedAt time.Time        `json:"created_at" gorm:"autoCreateTime;index"`
	Data      datatypes.JSON   `json:"data,omitempty" gorm:"type:jsonb"`
}

type PushSubscription struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;index;not null"`
	Endpoint  string    `json:"endpoint" gorm:"type:text;not null;uniqueIndex"`
	P256dh    string    `json:"p256dh" gorm:"type:text;not null"`
	Auth      string    `json:"auth" gorm:"type:text;not null"`
	UserAgent string    `json:"user_agent" gorm:"type:varchar(255)"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type PushSubscriptionRepository interface {
	Upsert(ctx context.Context, sub *PushSubscription) error
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]PushSubscription, error)
	GetAll(ctx context.Context) ([]PushSubscription, error)
}

type NotificationUseCase interface {
	SendToUser(userID uuid.UUID, notification Notification) error
	SendToRole(role Role, notification Notification) error
	Broadcast(notification Notification) error
	GetNotificationsForUser(ctx context.Context, userID uuid.UUID, limit int) ([]Notification, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	SubscribePush(ctx context.Context, sub *PushSubscription) error
	UnsubscribePush(ctx context.Context, endpoint string) error
	SendPushNotification(ctx context.Context, userID uuid.UUID, title, body, icon, url string) error
}
