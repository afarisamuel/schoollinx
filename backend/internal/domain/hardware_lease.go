package domain

import (
	"time"

	"github.com/google/uuid"
)

type HardwareStatus string

const (
	HardwareStatusActive   HardwareStatus = "ACTIVE"
	HardwareStatusReturned HardwareStatus = "RETURNED"
	HardwareStatusBroken   HardwareStatus = "BROKEN"
)

// HardwareLease tracks hardware sold or leased to a school (e.g., ID card printers).
type HardwareLease struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID    uuid.UUID      `json:"tenant_id" gorm:"type:uuid;not null;index"`
	ItemName    string         `json:"item_name" gorm:"type:varchar(255);not null"`
	MonthlyCost float64        `json:"monthly_cost" gorm:"default:0"` // 0 if bought outright
	UpfrontCost float64        `json:"upfront_cost" gorm:"default:0"`
	Status      HardwareStatus `json:"status" gorm:"type:varchar(50);not null;default:'ACTIVE'"`
	SerialNumber string        `json:"serial_number" gorm:"type:varchar(255)"`
	AcquiredAt  time.Time      `json:"acquired_at" gorm:"default:CURRENT_TIMESTAMP"`
	CreatedAt   time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	
	Tenant      *Tenant        `json:"tenant,omitempty" gorm:"foreignKey:TenantID"`
}
