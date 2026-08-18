package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SubjectRecommendation represents a suggested course for a student based on heuristics.
type SubjectRecommendation struct {
	TenantBase
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID       uuid.UUID `json:"student_id" gorm:"index;type:uuid;not null"`
	SubjectID       uuid.UUID `json:"subject_id" gorm:"type:uuid;not null"` // The subject being recommended
	SubjectName     string    `json:"subject_name" gorm:"-"`                // Hydrated for the frontend
	Category        string    `json:"category" gorm:"-"`
	ConfidenceScore float64   `json:"confidence_score"` // e.g., 0.85 (85% confident they will succeed or need this)
	Rationale       string    `json:"rationale"`        // e.g., "Because you scored 92% in Algebra I"
	IsEnrichment    bool      `json:"is_enrichment"`    // Flag for remedial/support vs advanced
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	Student *Student `json:"student,omitempty" gorm:"foreignKey:StudentID"`
}

// LearningPath groups a set of recommendations for a specific student.
type LearningPath struct {
	TenantBase
	StudentID       uuid.UUID               `json:"student_id"`
	StudentName     string                  `json:"student_name"`
	Recommendations []SubjectRecommendation `json:"recommendations"`
	GeneratedAt     time.Time               `json:"generated_at"`
}

type RecommendationRepository interface {
	SaveRecommendations(ctx context.Context, studentID uuid.UUID, recs []SubjectRecommendation) error
	GetStudentRecommendations(ctx context.Context, studentID uuid.UUID) ([]SubjectRecommendation, error)
	DeleteStudentRecommendations(ctx context.Context, studentID uuid.UUID) error
}

type RecommendationEngine interface {
	// GenerateInsights processes historical data to formulate new SubjectRecommendations for a student.
	GenerateInsights(ctx context.Context, studentID uuid.UUID) error
	// GenerateAllInsights triggers a batch job for all active students.
	GenerateAllInsights(ctx context.Context) error
	// GetLearningPath retrieves the pre-calculated recommendations.
	GetLearningPath(ctx context.Context, studentID uuid.UUID) (*LearningPath, error)
}
