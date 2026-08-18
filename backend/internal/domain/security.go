package domain

import (
	"time"

	"github.com/google/uuid"
)

type SystemAuditAction string

const (
	SysActionImpersonate  SystemAuditAction = "IMPERSONATE_TENANT"
	SysActionWipe         SystemAuditAction = "WIPE_TENANT"
	SysActionInjectCredit SystemAuditAction = "INJECT_CREDIT"
	SysActionForceReset   SystemAuditAction = "FORCE_PASSWORD_RESET"
	SysActionToggle2FA    SystemAuditAction = "TOGGLE_2FA"
	SysActionUpdateConfig SystemAuditAction = "UPDATE_CONFIG"
)

// SystemAuditLog tracks dangerous actions performed by Super Admins on the platform level.
type SystemAuditLog struct {
	ID        uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AdminID   uuid.UUID         `json:"admin_id" gorm:"type:uuid;index"`
	TargetID  *uuid.UUID        `json:"target_id" gorm:"type:uuid;index"` // Typically the Tenant ID affected
	Action    SystemAuditAction `json:"action" gorm:"type:varchar(50);not null"`
	Details   string            `json:"details" gorm:"type:text"`
	IPAddress string            `json:"ip_address" gorm:"type:varchar(50)"`
	CreatedAt time.Time         `json:"created_at" gorm:"autoCreateTime;index"`
}

// WhitelistedIP defines which IPs are allowed to access the Super Admin Dashboard.
type WhitelistedIP struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	IPAddress   string    `json:"ip_address" gorm:"type:varchar(50);uniqueIndex;not null"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	AddedBy     uuid.UUID `json:"added_by" gorm:"type:uuid"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}
