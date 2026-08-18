package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// StockItem is an extended inventory model for consumable stock tracking
// (separate from InventoryItem in facility.go which tracks fixed assets)
type StockItem struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID        uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Name            string    `json:"name" gorm:"not null"`
	SKU             string    `json:"sku" gorm:"uniqueIndex;not null"`
	Category        string    `json:"category" gorm:"not null"` // CONSUMABLE, EQUIPMENT
	Unit            string    `json:"unit" gorm:"not null"`     // pcs, kg, litres
	ReorderLevel    int       `json:"reorder_level" gorm:"not null;default:0"`
	CurrentQuantity int       `json:"current_quantity" gorm:"not null;default:0"`
	UnitCost        float64   `json:"unit_cost" gorm:"not null;default:0"`
	LocationNotes   string    `json:"location_notes"`
	IsActive        bool      `json:"is_active" gorm:"default:true"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type StockMovementType string

const (
	StockMovementIn     StockMovementType = "IN"
	StockMovementOut    StockMovementType = "OUT"
	StockMovementAdjust StockMovementType = "ADJUST"
)

type StockMovement struct {
	ID        uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID         `json:"tenant_id" gorm:"type:uuid;index;not null"`
	ItemID    uuid.UUID         `json:"item_id" gorm:"type:uuid;index;not null"`
	Type      StockMovementType `json:"type" gorm:"type:varchar(10);not null"`
	Quantity  int               `json:"quantity" gorm:"not null"`
	Reference string            `json:"reference"`
	Remarks   string            `json:"remarks"`
	CreatedBy uuid.UUID         `json:"created_by" gorm:"type:uuid"`
	CreatedAt time.Time         `json:"created_at"`
}

type StockRepository interface {
	CreateItem(ctx context.Context, item *StockItem) error
	GetItem(ctx context.Context, id uuid.UUID) (*StockItem, error)
	ListItems(ctx context.Context, tenantID uuid.UUID) ([]*StockItem, error)
	UpdateItem(ctx context.Context, item *StockItem) error
	RecordMovement(ctx context.Context, movement *StockMovement) error
	GetItemMovements(ctx context.Context, itemID uuid.UUID) ([]*StockMovement, error)
	GetLowStockItems(ctx context.Context, tenantID uuid.UUID) ([]*StockItem, error)
}
