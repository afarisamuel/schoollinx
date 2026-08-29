package domain

import (
	"context"

	"github.com/google/uuid"
)

// InstitutionalKPI represents aggregated high-level metrics across the institution
type InstitutionalKPI struct {
	TenantBase
	TotalStudents       int64   `json:"total_students"`
	TotalTeachers       int64   `json:"total_teachers"`
	TotalGuardians      int64   `json:"total_guardians"`
	AverageGPA          float64 `json:"average_gpa"`
	AverageAttendance   float64 `json:"average_attendance"`
	TotalRevenue        float64 `json:"total_revenue"`
	LibraryLoans        int64   `json:"library_loans"`        // Active loans
	ActiveAcademicYear  string  `json:"active_academic_year"` // e.g. "2023/2024"
	ActiveTerm          string  `json:"active_term"`          // e.g. "Term 1"
	TermCount           int     `json:"term_count"`           // Total terms in year
	TotalLevels         int64   `json:"total_levels"`         // Count of scholastic levels
}

// RetentionRisk represents a student identified as a drop-out risk
type RetentionRisk struct {
	TenantBase
	StudentID      uuid.UUID `json:"student_id"`
	StudentName    string    `json:"student_name"`
	RiskScore      float64   `json:"risk_score"` // 0.0 to 1.0 (Higher is worse)
	PrimaryFactors []string  `json:"primary_factors"`
}

// CourseDemand represents forecasted enrollment numbers for a subject
type CourseDemand struct {
	TenantBase
	SubjectID         uuid.UUID `json:"subject_id"`
	SubjectName       string    `json:"subject_name"`
	CurrentEnrollment int64     `json:"current_enrollment"`
	ProjectedDemand   int64     `json:"projected_demand"`
	TeacherShortage   bool      `json:"teacher_shortage"`
}

type IntelligenceRepository interface {
	GetAggregateKPIs(ctx context.Context) (*InstitutionalKPI, error)
	GetRetentionRisks(ctx context.Context, threshold float64) ([]RetentionRisk, error)
	GetCourseDemand(ctx context.Context) ([]CourseDemand, error)
}

type IntelligenceUseCase interface {
	GetDashboardMetadata(ctx context.Context) (*InstitutionalKPI, error)
	AnalyzeRetentionRisk(ctx context.Context) ([]RetentionRisk, error)
	ForecastCourseDemand(ctx context.Context) ([]CourseDemand, error)
	GenerateExecutiveReportCSV(ctx context.Context) ([]byte, error)
	GenerateInterventions(ctx context.Context) error
}

type InterventionStatus string

const (
	InterventionStatusDraft      InterventionStatus = "DRAFT"
	InterventionStatusActive     InterventionStatus = "ACTIVE"
	InterventionStatusCompleted  InterventionStatus = "COMPLETED"
	InterventionStatusCancelled  InterventionStatus = "CANCELLED"
)

// InterventionPlan represents an AI-suggested plan to help a struggling student
type InterventionPlan struct {
	TenantBase
	ID          uuid.UUID          `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID   uuid.UUID          `json:"student_id" gorm:"type:uuid;not null;index"`
	RiskScore   float64            `json:"risk_score" gorm:"not null"`
	Reason      string             `json:"reason" gorm:"not null"`      // e.g. "Low attendance, failing math"
	ActionItems []string           `json:"action_items" gorm:"serializer:json"` // Suggested actions
	Status      InterventionStatus `json:"status" gorm:"default:DRAFT"`
}

type InterventionRepository interface {
	Create(ctx context.Context, plan *InterventionPlan) error
	GetByStudent(ctx context.Context, studentID uuid.UUID) ([]InterventionPlan, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status InterventionStatus) error
}
