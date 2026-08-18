package domain

import (
	"time"

	"github.com/google/uuid"
)

type NotificationType string

const (
	NotificationAttendance NotificationType = "ATTENDANCE"
	NotificationGrade      NotificationType = "GRADE"
	NotificationSystem     NotificationType = "SYSTEM"
)

type Notification struct {
	TenantBase
	ID        uuid.UUID        `json:"id"`
	UserID    uuid.UUID        `json:"user_id"`
	Type      NotificationType `json:"type"`
	Title     string           `json:"title"`
	Message   string           `json:"message"`
	Read      bool             `json:"read"`
	CreatedAt time.Time        `json:"created_at"`
	Data      interface{}      `json:"data,omitempty"`
}

type NotificationUseCase interface {
	SendToUser(userID uuid.UUID, notification Notification) error
	SendToRole(role Role, notification Notification) error
	Broadcast(notification Notification) error
}
