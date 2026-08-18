package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DocumentCategory categorizes the type of document
type DocumentCategory string

const (
	DocCategoryMedical     DocumentCategory = "MEDICAL"
	DocCategoryAcademic    DocumentCategory = "ACADEMIC"
	DocCategoryLegal       DocumentCategory = "LEGAL"
	DocCategoryIdentity    DocumentCategory = "IDENTITY"
	DocCategoryDisciplinary DocumentCategory = "DISCIPLINARY"
	DocCategoryOther       DocumentCategory = "OTHER"
)

// Document represents an uploaded file linked to a student or staff
type Document struct {
	TenantBase
	ID             uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	OwnerID        uuid.UUID        `json:"owner_id" gorm:"type:uuid;not null;index"` // UUID of Student or User
	OwnerType      string           `json:"owner_type" gorm:"not null"` // 'STUDENT' or 'STAFF'
	Category       DocumentCategory `json:"category" gorm:"not null"`
	Title          string           `json:"title" gorm:"not null"`
	Description    string           `json:"description"`
	FileMimeType   string           `json:"file_mime_type" gorm:"not null"`
	FileSize       int64            `json:"file_size"` // Size in bytes
	StoragePath    string           `json:"storage_path" gorm:"not null"` // Local filesystem path or S3 key
	UploadedBy     uuid.UUID        `json:"uploaded_by" gorm:"type:uuid;not null"`
	UploadedAt     time.Time        `json:"uploaded_at" gorm:"autoCreateTime"`
}

func (d *Document) BeforeCreate(tx *gorm.DB) (err error) {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return
}

type DocumentRepository interface {
	Create(ctx context.Context, doc *Document) error
	GetByID(ctx context.Context, id uuid.UUID) (*Document, error)
	GetByOwner(ctx context.Context, ownerID uuid.UUID) ([]Document, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type DocumentUseCase interface {
	UploadDocument(ctx context.Context, doc *Document, fileBytes []byte) error
	GetDocument(ctx context.Context, id uuid.UUID) (*Document, error)
	GetDocumentsByOwner(ctx context.Context, ownerID uuid.UUID) ([]Document, error)
	DownloadDocument(ctx context.Context, id uuid.UUID) (*Document, []byte, error)
	DeleteDocument(ctx context.Context, id uuid.UUID) error
}
