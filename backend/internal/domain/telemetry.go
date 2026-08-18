package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type TelemetryEventType string

const (
	TelemetryEventModuleAccess   TelemetryEventType = "MODULE_ACCESS"
	TelemetryEventLogin          TelemetryEventType = "LOGIN"
	TelemetryEventOnboardingStep TelemetryEventType = "ONBOARDING_STEP"
	TelemetryEventError          TelemetryEventType = "ERROR"
	TelemetryEventAction         TelemetryEventType = "ACTION"
)

// TelemetryEvent tracks generic platform usage globally
type TelemetryEvent struct {
	ID        uuid.UUID          `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID  uuid.UUID          `json:"tenant_id" gorm:"type:uuid;index"`
	UserID    uuid.UUID          `json:"user_id" gorm:"type:uuid"`
	EventType TelemetryEventType `json:"event_type" gorm:"type:varchar(50);not null;index"`
	Metadata  datatypes.JSON     `json:"metadata" gorm:"type:jsonb;default:'{}'"`
	IPAddress string             `json:"ip_address" gorm:"type:varchar(50)"`
	Device    string             `json:"device" gorm:"type:varchar(50)"`
	CreatedAt time.Time          `json:"created_at" gorm:"autoCreateTime;index"`
}
