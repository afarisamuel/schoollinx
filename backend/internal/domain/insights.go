package domain

import (
	"context"

	"github.com/google/uuid"
)

type RecommendationType string

const (
	TypeSubjectRecommendation RecommendationType = "SUBJECT"
	TypeCareerPath            RecommendationType = "CAREER"
	TypeRiskIntervention      RecommendationType = "RISK"
	TypeEnrichment            RecommendationType = "ENRICHMENT"
)

type AcademicInsight struct {
	TenantBase
	ID                 uuid.UUID          `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID          uuid.UUID          `json:"student_id" gorm:"type:uuid;not null"`
	Type               RecommendationType `json:"type" gorm:"not null"`
	Title              string             `json:"title" gorm:"not null"`
	Description        string             `json:"description"`
	ConfidenceScore    float64            `json:"confidence_score"` // 0.0 to 1.0
	Reasoning          string             `json:"reasoning"`
	SuggestedSubjectID *uuid.UUID         `json:"suggested_subject_id,omitempty" gorm:"type:uuid"`
}

type StudentSuccessScore struct {
	TenantBase
	StudentID      uuid.UUID `json:"student_id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	GPA            float64   `json:"gpa"`
	AttendanceRate float64   `json:"attendance_rate"`
	CompositeScore float64   `json:"composite_score"` // Weighted GPA + Attendance + Fiscal
	RiskLevel      string    `json:"risk_level"`      // High, Medium, Low
	FeeDebt        float64   `json:"fee_debt"`        // Outstanding fee balance
	Reasons        []string  `json:"reasons"`         // Human-readable risk factors
}

type AcademicUseCase interface {
	// Insights
	GetStudentInsights(ctx context.Context, studentID uuid.UUID) ([]AcademicInsight, error)
	GetSuccessScore(ctx context.Context, studentID uuid.UUID) (*StudentSuccessScore, error)

	// Administrative Oversight
	GetAtRiskStudents(ctx context.Context) ([]StudentSuccessScore, error)

	// Background Analysis
	RefreshAcademicInsights(ctx context.Context) error
}
