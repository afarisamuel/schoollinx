package usecase

import (
	"context"
	"time"

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
	GetDatabaseStats(ctx context.Context) (map[string]interface{}, error)
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

	event := domain.TelemetryEvent{
		TenantID:  tID,
		UserID:    uID,
		EventType: eventType,
		IPAddress: ip,
		Device:    device,
	}

	return u.db.WithContext(ctx).Create(&event).Error
}

// GetActiveUsers aggregates real active tenant login counts from telemetry_events in the past 24 hours.
func (u *telemetryUseCase) GetActiveUsers(ctx context.Context) ([]map[string]interface{}, error) {
	type row struct {
		TenantID    uuid.UUID `gorm:"column:tenant_id"`
		TenantName  string    `gorm:"column:tenant_name"`
		ActiveCount int64     `gorm:"column:active_count"`
	}
	var rows []row

	since := time.Now().Add(-24 * time.Hour)
	err := u.db.WithContext(ctx).Table("public.telemetry_events te").
		Select("te.tenant_id, t.name AS tenant_name, COUNT(DISTINCT te.user_id) AS active_count").
		Joins("LEFT JOIN public.tenants t ON t.id = te.tenant_id").
		Where("te.created_at >= ?", since).
		Group("te.tenant_id, t.name").
		Order("active_count DESC").
		Limit(20).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		result = append(result, map[string]interface{}{
			"tenant_id":    r.TenantID,
			"tenant_name":  r.TenantName,
			"active_count": r.ActiveCount,
		})
	}
	return result, nil
}

// GetModuleUsage aggregates actual event-type frequencies to produce module usage percentages.
func (u *telemetryUseCase) GetModuleUsage(ctx context.Context) ([]map[string]interface{}, error) {
	type row struct {
		EventType string `gorm:"column:event_type"`
		Count     int64  `gorm:"column:count"`
	}
	var rows []row

	since := time.Now().Add(-30 * 24 * time.Hour) // last 30 days
	err := u.db.WithContext(ctx).Table("public.telemetry_events").
		Select("event_type, COUNT(*) AS count").
		Where("created_at >= ?", since).
		Group("event_type").
		Order("count DESC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	var total int64
	for _, r := range rows {
		total += r.Count
	}
	if total == 0 {
		total = 1
	}

	result := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		pct := float64(r.Count) * 100 / float64(total)
		result = append(result, map[string]interface{}{
			"module":           r.EventType,
			"count":            r.Count,
			"usage_percentage": pct,
		})
	}
	return result, nil
}

// GetFunnelMetrics derives tenant onboarding funnel from real tenant records.
func (u *telemetryUseCase) GetFunnelMetrics(ctx context.Context) ([]map[string]interface{}, error) {
	type funnelStep struct {
		Step  string
		Query string
	}

	steps := []funnelStep{
		{"Sign Up", "SELECT COUNT(*) FROM public.tenants"},
		{"Active Tenant", "SELECT COUNT(*) FROM public.tenants WHERE is_active = true"},
		{"Trial Active", "SELECT COUNT(*) FROM public.tenants WHERE is_active = true AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW()"},
		{"Paid Subscribers", "SELECT COUNT(*) FROM public.tenants WHERE is_active = true AND (billing_due_date IS NOT NULL OR fixed_price_override > 0)"},
	}

	result := make([]map[string]interface{}, 0, len(steps))
	for _, step := range steps {
		var count int64
		u.db.WithContext(ctx).Raw(step.Query).Scan(&count)
		result = append(result, map[string]interface{}{
			"step":  step.Step,
			"count": count,
		})
	}
	return result, nil
}

// GetErrors aggregates real error-type audit log entries from public.system_audit_logs.
func (u *telemetryUseCase) GetErrors(ctx context.Context) ([]map[string]interface{}, error) {
	type row struct {
		Action string `gorm:"column:action"`
		Count  int64  `gorm:"column:count"`
	}
	var rows []row

	since := time.Now().Add(-7 * 24 * time.Hour) // last 7 days
	err := u.db.WithContext(ctx).Table("public.system_audit_logs").
		Select("action, COUNT(*) AS count").
		Where("created_at >= ? AND action ILIKE ? ", since, "%error%").
		Group("action").
		Order("count DESC").
		Limit(10).
		Scan(&rows).Error
	if err != nil {
		// fallback: query telemetry_events for error types
		var evRows []row
		_ = u.db.WithContext(ctx).Table("public.telemetry_events").
			Select("event_type AS action, COUNT(*) AS count").
			Where("created_at >= ? AND event_type ILIKE ?", since, "%error%").
			Group("event_type").
			Order("count DESC").
			Limit(10).
			Scan(&evRows).Error
		rows = evRows
	}

	result := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		result = append(result, map[string]interface{}{
			"error": r.Action,
			"count": r.Count,
		})
	}
	return result, nil
}

// GetDatabaseStats retrieves live connection pool metrics from the underlying sql.DB.
func (u *telemetryUseCase) GetDatabaseStats(ctx context.Context) (map[string]interface{}, error) {
	if u.db == nil {
		return nil, nil
	}
	sqlDB, err := u.db.DB()
	if err != nil {
		return nil, err
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":            stats.WaitCount,
		"wait_duration_ms":      stats.WaitDuration.Milliseconds(),
		"max_idle_closed":       stats.MaxIdleClosed,
		"max_lifetime_closed":   stats.MaxLifetimeClosed,
	}, nil
}
