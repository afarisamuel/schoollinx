package domain

import (
	"time"

	"github.com/google/uuid"
)

type TenantNote struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Author    string    `json:"author" gorm:"type:varchar(255);not null"`
	Category  string    `json:"category" gorm:"type:varchar(50);default:'GENERAL'"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (TenantNote) TableName() string {
	return "public.tenant_notes"
}
