package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type TelemetryUseCase interface {
	LogEvent(ctx context.Context, tenantID *uuid.UUID, userID *uuid.UUID, eventType domain.TelemetryEventType, metadata map[string]interface{}, ip string, device string) error
	GetActiveUsers(ctx context.Context) ([]map[string]interface{}, error)
	GetModuleUsage(ctx context.Context) ([]map[string]interface{}, error)
	GetFunnelMetrics(ctx context.Context) ([]map[string]interface{}, error)
	GetErrors(ctx context.Context) ([]map[string]interface{}, error)
}

type telemetryUseCase struct {
	db *gorm.DB
}

func NewTelemetryUseCase(db *gorm.DB) TelemetryUseCase {
	return &telemetryUseCase{db: db}
}

func (u *telemetryUseCase) LogEvent(ctx context.Context, tenantID *uuid.UUID, userID *uuid.UUID, eventType domain.TelemetryEventType, metadata map[string]interface{}, ip string, device string) error {
	var tID, uID uuid.UUID
	if tenantID != nil {
		tID = *tenantID
	}
	if userID != nil {
		uID = *userID
	}

	// Marshal metadata securely or pass it down depending on JSON datatype, but since Metadata is datatypes.JSON, we should convert
	// We'll skip complex marshalling for this stub and just use a default empty JSON
	event := domain.TelemetryEvent{
		TenantID:  tID,
		UserID:    uID,
		EventType: eventType,
		IPAddress: ip,
		Device:    device,
	}

	return u.db.WithContext(ctx).Create(&event).Error
}

func (u *telemetryUseCase) GetActiveUsers(ctx context.Context) ([]map[string]interface{}, error) {
	// Mock returning some recent login events grouped by tenant
	res := []map[string]interface{}{
		{"tenant_name": "St. Mary's High", "active_count": 142, "location": "Accra"},
		{"tenant_name": "Achimota School", "active_count": 89, "location": "Accra"},
		{"tenant_name": "Prempeh College", "active_count": 210, "location": "Kumasi"},
	}
	return res, nil
}

func (u *telemetryUseCase) GetModuleUsage(ctx context.Context) ([]map[string]interface{}, error) {
	// Mock usage counts for pie charts
	res := []map[string]interface{}{
		{"module": "Finance", "usage_percentage": 35},
		{"module": "Grading", "usage_percentage": 45},
		{"module": "HR", "usage_percentage": 10},
		{"module": "Library", "usage_percentage": 10},
	}
	return res, nil
}

func (u *telemetryUseCase) GetFunnelMetrics(ctx context.Context) ([]map[string]interface{}, error) {
	// Mock funnel drop-off
	res := []map[string]interface{}{
		{"step": "Sign Up", "count": 100},
		{"step": "Create School", "count": 85},
		{"step": "Add First Student", "count": 60},
		{"step": "Complete Setup", "count": 45},
	}
	return res, nil
}

func (u *telemetryUseCase) GetErrors(ctx context.Context) ([]map[string]interface{}, error) {
	// Mock common errors
	res := []map[string]interface{}{
		{"error": "JWT Expired", "count": 1205},
		{"error": "Database Connection Timeout", "count": 43},
		{"error": "Invalid Subject ID", "count": 890},
	}
	return res, nil
}
