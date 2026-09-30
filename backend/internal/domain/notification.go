package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type NotificationType string

const (
	NotificationAttendance   NotificationType = "ATTENDANCE"
	NotificationGrade        NotificationType = "GRADE"
	NotificationSystem       NotificationType = "SYSTEM"
	NotificationPayment      NotificationType = "PAYMENT"
	NotificationMessage      NotificationType = "MESSAGE"
	NotificationExam         NotificationType = "EXAM"
	NotificationWelfare      NotificationType = "WELFARE"
	NotificationAnnouncement NotificationType = "ANNOUNCEMENT"
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
	PushedAt  *time.Time       `json:"pushed_at,omitempty" gorm:"index"`
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

type NotificationPreference struct {
	TenantBase
	ID                 uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID             uuid.UUID `json:"user_id" gorm:"type:uuid;uniqueIndex;not null"`
	AttendanceAlerts   bool      `json:"attendance_alerts" gorm:"default:true"`
	GradeAlerts        bool      `json:"grade_alerts" gorm:"default:true"`
	PaymentAlerts      bool      `json:"payment_alerts" gorm:"default:true"`
	MessageAlerts      bool      `json:"message_alerts" gorm:"default:true"`
	AnnouncementAlerts bool      `json:"announcement_alerts" gorm:"default:true"`
	WelfareAlerts      bool      `json:"welfare_alerts" gorm:"default:true"`
	QuietHoursEnabled  bool      `json:"quiet_hours_enabled" gorm:"default:false"`
	QuietHoursStart    string    `json:"quiet_hours_start" gorm:"type:varchar(5);default:'21:00'"`
	QuietHoursEnd      string    `json:"quiet_hours_end" gorm:"type:varchar(5);default:'06:30'"`
	CreatedAt          time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type PushSubscriptionRepository interface {
	Upsert(ctx context.Context, sub *PushSubscription) error
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	DeleteByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]PushSubscription, error)
	GetAll(ctx context.Context) ([]PushSubscription, error)
	GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error)
	UpsertPreferences(ctx context.Context, pref *NotificationPreference) error
}

type NotificationUseCase interface {
	SendToUser(ctx context.Context, userID uuid.UUID, notification Notification) error
	SendToRole(ctx context.Context, role Role, notification Notification) error
	Broadcast(ctx context.Context, notification Notification) error
	GetNotificationsForUser(ctx context.Context, userID uuid.UUID, limit int) ([]Notification, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	SubscribePush(ctx context.Context, sub *PushSubscription) error
	UnsubscribePush(ctx context.Context, endpoint string) error
	GetUserSubscriptions(ctx context.Context, userID uuid.UUID) ([]PushSubscription, error)
	DeleteSubscription(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error)
	UpdatePreferences(ctx context.Context, pref *NotificationPreference) error
	SendPushNotification(ctx context.Context, userID uuid.UUID, title, body, icon, url string) error
}
