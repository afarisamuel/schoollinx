package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type LostAndFoundItem struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	ItemName      string     `json:"item_name" db:"item_name"`
	Description   *string    `json:"description" db:"description"`
	Category      *string    `json:"category" db:"category"`
	FoundLocation string     `json:"found_location" db:"found_location"`
	DateFound     time.Time  `json:"date_found" db:"date_found"`
	Status        string     `json:"status" db:"status"` // UNCLAIMED, CLAIMED, DISCARDED
	ReportedByID  *uuid.UUID `json:"reported_by_id" db:"reported_by_id"`
	ClaimedByID   *uuid.UUID `json:"claimed_by_id" db:"claimed_by_id"`
	DateClaimed   *time.Time `json:"date_claimed" db:"date_claimed"`
	DeletedAt     *time.Time `json:"deleted_at" db:"deleted_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type DisciplinaryIncident struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	StudentID      uuid.UUID  `json:"student_id" db:"student_id"`
	ReportedByID   uuid.UUID  `json:"reported_by_id" db:"reported_by_id"`
	IncidentDate   time.Time  `json:"incident_date" db:"incident_date"`
	IncidentType   string     `json:"incident_type" db:"incident_type"`
	Description    *string    `json:"description" db:"description"`
	ActionTaken    *string    `json:"action_taken" db:"action_taken"`
	Status         string     `json:"status" db:"status"` // OPEN, RESOLVED
	PointsDeducted int        `json:"points_deducted" db:"points_deducted"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

type CampusOpsRepository interface {
	// Lost and Found
	CreateLostItem(ctx context.Context, item *LostAndFoundItem) error
	GetLostItems(ctx context.Context) ([]*LostAndFoundItem, error)
	UpdateLostItemStatus(ctx context.Context, id uuid.UUID, status string, claimedBy *uuid.UUID) error

	// Visitors
	CreateVisitorLog(ctx context.Context, log *VisitorLog) error
	GetActiveVisitors(ctx context.Context) ([]*VisitorLog, error)
	SignOutVisitor(ctx context.Context, id uuid.UUID) error

	// Disciplinary
	CreateDisciplinaryIncident(ctx context.Context, incident *DisciplinaryIncident) error
	GetStudentIncidents(ctx context.Context, studentID uuid.UUID) ([]*DisciplinaryIncident, error)
	UpdateIncidentStatus(ctx context.Context, id uuid.UUID, status string) error
}

type CampusOpsUseCase interface {
	ReportLostItem(ctx context.Context, item *LostAndFoundItem) error
	ClaimLostItem(ctx context.Context, itemID, claimedByID uuid.UUID) error
	ListLostItems(ctx context.Context) ([]*LostAndFoundItem, error)

	SignInVisitor(ctx context.Context, log *VisitorLog) error
	SignOutVisitor(ctx context.Context, logID uuid.UUID) error
	ListActiveVisitors(ctx context.Context) ([]*VisitorLog, error)

	ReportIncident(ctx context.Context, incident *DisciplinaryIncident) error
	ResolveIncident(ctx context.Context, incidentID uuid.UUID) error
	ListStudentIncidents(ctx context.Context, studentID uuid.UUID) ([]*DisciplinaryIncident, error)
}
