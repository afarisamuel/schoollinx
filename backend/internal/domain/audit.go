package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditAction string

const (
	ActionCreate     AuditAction = "CREATE"
	ActionUpdate     AuditAction = "UPDATE"
	ActionDelete     AuditAction = "DELETE"
	ActionBulkDelete AuditAction = "BULK_DELETE"
)

type AuditLog struct {
	TenantBase
	ID         uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey"`
	UserID     uuid.UUID   `json:"user_id" gorm:"type:uuid"`
	UserEmail  string      `json:"user_email"`
	Action     AuditAction `json:"action"`
	EntityType string      `json:"entity_type"`
	EntityID   string      `json:"entity_id"`
	Changes    string      `json:"changes"` // JSON string of changes
	IPAddress  string      `json:"ip_address"`
	CreatedAt  time.Time   `json:"created_at"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}

type AuditRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	GetAll(ctx context.Context) ([]AuditLog, error)
	GetAllPaginated(ctx context.Context, query PaginationQuery) ([]AuditLog, int64, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]AuditLog, error)
}

type AuditUseCase interface {
	Log(ctx context.Context, log *AuditLog) error
	GetAllLogs(ctx context.Context) ([]AuditLog, error)
	GetAllLogsPaginated(ctx context.Context, query PaginationQuery) ([]AuditLog, int64, error)
}
