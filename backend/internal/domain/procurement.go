package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SupplierStatus string

const (
	SupplierStatusActive   SupplierStatus = "ACTIVE"
	SupplierStatusInactive SupplierStatus = "INACTIVE"
)

type Supplier struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID      `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Name        string         `json:"name" gorm:"not null"`
	ContactName string         `json:"contact_name"`
	Email       string         `json:"email"`
	Phone       string         `json:"phone"`
	Address     string         `json:"address"`
	Status      SupplierStatus `json:"status" gorm:"type:varchar(20);default:'ACTIVE'"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type PurchaseOrderStatus string

const (
	POStatusDraft     PurchaseOrderStatus = "DRAFT"
	POStatusSubmitted PurchaseOrderStatus = "SUBMITTED"
	POStatusApproved  PurchaseOrderStatus = "APPROVED"
	POStatusReceived  PurchaseOrderStatus = "RECEIVED"
	POStatusCancelled PurchaseOrderStatus = "CANCELLED"
)

type PurchaseOrder struct {
	ID          uuid.UUID           `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID           `json:"tenant_id" gorm:"type:uuid;index;not null"`
	SupplierID  uuid.UUID           `json:"supplier_id" gorm:"type:uuid;index;not null"`
	PONumber    string              `json:"po_number" gorm:"uniqueIndex;not null"`
	Status      PurchaseOrderStatus `json:"status" gorm:"type:varchar(20);not null;default:'DRAFT'"`
	TotalAmount float64             `json:"total_amount" gorm:"not null;default:0"`
	Notes       string              `json:"notes"`
	ApprovedBy  *uuid.UUID          `json:"approved_by" gorm:"type:uuid"`
	ReceivedAt  *time.Time          `json:"received_at"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	Items       []POLineItem        `json:"items,omitempty" gorm:"foreignKey:POID"`
}

type POLineItem struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	POID        uuid.UUID `json:"po_id" gorm:"type:uuid;index;not null"`
	ItemID      uuid.UUID `json:"item_id" gorm:"type:uuid;index;not null"`
	Quantity    int       `json:"quantity" gorm:"not null"`
	UnitPrice   float64   `json:"unit_price" gorm:"not null"`
	TotalPrice  float64   `json:"total_price" gorm:"not null"`
}

type ProcurementRepository interface {
	CreateSupplier(ctx context.Context, supplier *Supplier) error
	ListSuppliers(ctx context.Context, tenantID uuid.UUID) ([]*Supplier, error)

	CreatePO(ctx context.Context, po *PurchaseOrder) error
	GetPO(ctx context.Context, id uuid.UUID) (*PurchaseOrder, error)
	ListPOs(ctx context.Context, tenantID uuid.UUID) ([]*PurchaseOrder, error)
	UpdatePOStatus(ctx context.Context, id uuid.UUID, status PurchaseOrderStatus) error
}
