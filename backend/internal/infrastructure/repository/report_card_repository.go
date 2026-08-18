package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type reportCardRepository struct {
	db *gorm.DB
}

func NewReportCardRepository(db *gorm.DB) domain.ReportCardRepository {
	return &reportCardRepository{db: db}
}

func (r *reportCardRepository) CreateTemplate(ctx context.Context, tmpl *domain.ReportCardTemplate) error {
	if tmpl.ID == uuid.Nil {
		tmpl.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(tmpl).Error
}

func (r *reportCardRepository) GetTemplate(ctx context.Context, id uuid.UUID) (*domain.ReportCardTemplate, error) {
	var tmpl domain.ReportCardTemplate
	if err := r.db.WithContext(ctx).First(&tmpl, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &tmpl, nil
}

func (r *reportCardRepository) ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportCardTemplate, error) {
	var tmpls []*domain.ReportCardTemplate
	if err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&tmpls).Error; err != nil {
		return nil, err
	}
	return tmpls, nil
}

func (r *reportCardRepository) CreateReportCard(ctx context.Context, rc *domain.ReportCard) error {
	if rc.ID == uuid.Nil {
		rc.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(rc).Error
}

func (r *reportCardRepository) GetReportCard(ctx context.Context, id uuid.UUID) (*domain.ReportCard, error) {
	var rc domain.ReportCard
	if err := r.db.WithContext(ctx).First(&rc, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &rc, nil
}

func (r *reportCardRepository) ListReportCardsByStudent(ctx context.Context, studentID uuid.UUID) ([]*domain.ReportCard, error) {
	var rcs []*domain.ReportCard
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Order("created_at DESC").Find(&rcs).Error; err != nil {
		return nil, err
	}
	return rcs, nil
}

func (r *reportCardRepository) UpdateReportCardStatus(ctx context.Context, id uuid.UUID, status domain.ReportCardStatus, pdfURL *string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if pdfURL != nil {
		updates["pdf_url"] = *pdfURL
	}
	if status == domain.ReportStatusGenerated || status == domain.ReportStatusPublished {
		now := time.Now()
		updates["generated_at"] = now
	}
	return r.db.WithContext(ctx).Model(&domain.ReportCard{}).Where("id = ?", id).Updates(updates).Error
}
