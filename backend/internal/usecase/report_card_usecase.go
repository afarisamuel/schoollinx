package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ReportCardUseCase struct {
	repo domain.ReportCardRepository
}

func NewReportCardUseCase(repo domain.ReportCardRepository) *ReportCardUseCase {
	return &ReportCardUseCase{repo: repo}
}

func (u *ReportCardUseCase) CreateTemplate(ctx context.Context, tmpl *domain.ReportCardTemplate) error {
	return u.repo.CreateTemplate(ctx, tmpl)
}

func (u *ReportCardUseCase) ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportCardTemplate, error) {
	return u.repo.ListTemplates(ctx, tenantID)
}

func (u *ReportCardUseCase) GenerateReportCard(ctx context.Context, rc *domain.ReportCard) error {
	rc.Status = domain.ReportStatusDraft
	return u.repo.CreateReportCard(ctx, rc)
}

func (u *ReportCardUseCase) GetStudentReports(ctx context.Context, studentID uuid.UUID) ([]*domain.ReportCard, error) {
	return u.repo.ListReportCardsByStudent(ctx, studentID)
}

func (u *ReportCardUseCase) PublishReport(ctx context.Context, reportID uuid.UUID, pdfURL string) error {
	return u.repo.UpdateReportCardStatus(ctx, reportID, domain.ReportStatusPublished, &pdfURL)
}
