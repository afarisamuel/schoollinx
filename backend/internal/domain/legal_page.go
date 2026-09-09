package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LegalPage represents a dynamic legal document (e.g., Privacy Policy, Terms of Service, Cookie Policy).
type LegalPage struct {
	ID            uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Slug          string         `json:"slug" gorm:"type:varchar(100);uniqueIndex;not null"`
	Title         string         `json:"title" gorm:"type:varchar(255);not null"`
	Category      string         `json:"category" gorm:"type:varchar(50);default:'General'"` // Privacy, Compliance, Terms, Security
	Summary       string         `json:"summary" gorm:"type:text"`
	Content       string         `json:"content" gorm:"type:text;not null"`
	Version       string         `json:"version" gorm:"type:varchar(50);default:'1.0'"`
	IsPublished   bool           `json:"is_published" gorm:"default:true;index"`
	EffectiveDate *time.Time     `json:"effective_date"`
	LastUpdatedBy string         `json:"last_updated_by" gorm:"type:varchar(255)"`
	CreatedAt     time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}
