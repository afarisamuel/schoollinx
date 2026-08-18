package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type campusOpsUseCase struct {
	repo domain.CampusOpsRepository
}

func NewCampusOpsUseCase(repo domain.CampusOpsRepository) domain.CampusOpsUseCase {
	return &campusOpsUseCase{repo: repo}
}

// Lost and Found
func (uc *campusOpsUseCase) ReportLostItem(ctx context.Context, item *domain.LostAndFoundItem) error {
	item.Status = "UNCLAIMED"
	return uc.repo.CreateLostItem(ctx, item)
}

func (uc *campusOpsUseCase) ClaimLostItem(ctx context.Context, itemID, claimedByID uuid.UUID) error {
	return uc.repo.UpdateLostItemStatus(ctx, itemID, "CLAIMED", &claimedByID)
}

func (uc *campusOpsUseCase) ListLostItems(ctx context.Context) ([]*domain.LostAndFoundItem, error) {
	return uc.repo.GetLostItems(ctx)
}

// Visitors
func (uc *campusOpsUseCase) SignInVisitor(ctx context.Context, log *domain.VisitorLog) error {
	log.Status = "ACTIVE"
	return uc.repo.CreateVisitorLog(ctx, log)
}

func (uc *campusOpsUseCase) SignOutVisitor(ctx context.Context, logID uuid.UUID) error {
	return uc.repo.SignOutVisitor(ctx, logID)
}

func (uc *campusOpsUseCase) ListActiveVisitors(ctx context.Context) ([]*domain.VisitorLog, error) {
	return uc.repo.GetActiveVisitors(ctx)
}

// Disciplinary
func (uc *campusOpsUseCase) ReportIncident(ctx context.Context, incident *domain.DisciplinaryIncident) error {
	incident.Status = "OPEN"
	return uc.repo.CreateDisciplinaryIncident(ctx, incident)
}

func (uc *campusOpsUseCase) ResolveIncident(ctx context.Context, incidentID uuid.UUID) error {
	return uc.repo.UpdateIncidentStatus(ctx, incidentID, "RESOLVED")
}

func (uc *campusOpsUseCase) ListStudentIncidents(ctx context.Context, studentID uuid.UUID) ([]*domain.DisciplinaryIncident, error) {
	return uc.repo.GetStudentIncidents(ctx, studentID)
}
