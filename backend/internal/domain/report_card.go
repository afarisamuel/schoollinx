package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type ReportCardTemplate struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	LayoutJSON  string    `json:"layout_json" gorm:"type:jsonb;not null"` // Definition of the drag-and-drop layout
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ReportCardStatus string

const (
	ReportStatusDraft     ReportCardStatus = "DRAFT"
	ReportStatusGenerated ReportCardStatus = "GENERATED"
	ReportStatusPublished ReportCardStatus = "PUBLISHED"
)

type ReportCard struct {
	ID               uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID         uuid.UUID        `json:"tenant_id" gorm:"type:uuid;index;not null"`
	StudentID        uuid.UUID        `json:"student_id" gorm:"type:uuid;index;not null"`
	AcademicPeriodID uuid.UUID        `json:"academic_period_id" gorm:"type:uuid;index;not null"`
	TemplateID       uuid.UUID        `json:"template_id" gorm:"type:uuid;not null"`
	Status           ReportCardStatus `json:"status" gorm:"type:varchar(20);not null;default:'DRAFT'"`
	RenderedData     string           `json:"rendered_data" gorm:"type:jsonb"` // The baked JSON payload representing the report data
	PDFURL           *string          `json:"pdf_url"` // S3 or local path to the generated PDF
	GeneratedAt      *time.Time       `json:"generated_at"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

type ReportCardRepository interface {
	CreateTemplate(ctx context.Context, tmpl *ReportCardTemplate) error
	GetTemplate(ctx context.Context, id uuid.UUID) (*ReportCardTemplate, error)
	ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]*ReportCardTemplate, error)
	
	CreateReportCard(ctx context.Context, rc *ReportCard) error
	GetReportCard(ctx context.Context, id uuid.UUID) (*ReportCard, error)
	ListReportCardsByStudent(ctx context.Context, studentID uuid.UUID) ([]*ReportCard, error)
	UpdateReportCardStatus(ctx context.Context, id uuid.UUID, status ReportCardStatus, pdfURL *string) error
}
