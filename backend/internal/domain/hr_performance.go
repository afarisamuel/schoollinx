package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReviewStatus string

const (
	ReviewDraft          ReviewStatus = "DRAFT"
	ReviewEmployeeReview ReviewStatus = "EMPLOYEE_REVIEW" // Sent to employee for sign-off
	ReviewCompleted      ReviewStatus = "COMPLETED"
)

type PerformanceReview struct {
	TenantBase
	ID                   uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID              uuid.UUID     `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff                *StaffProfile `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	ReviewerID           uuid.UUID     `json:"reviewer_id" gorm:"type:uuid;not null"`
	ReviewDate           time.Time     `json:"review_date" gorm:"not null"`
	ReviewPeriod         string        `json:"review_period"` // e.g. "Q1 2026", "H1 2026", "2025-2026"
	Score                float64       `json:"score" gorm:"not null"` // out of 5
	Comments             string        `json:"comments"`
	Goals                string        `json:"goals"`
	Strengths            string        `json:"strengths"`
	AreasForImprovement  string        `json:"areas_for_improvement"`
	Recommendation       string        `json:"recommendation"` // PROMOTE, RETAIN, PIP, TERMINATE
	Status               ReviewStatus  `json:"status" gorm:"default:DRAFT"`
	EmployeeComments     string        `json:"employee_comments"`
	EmployeeSignedAt     *time.Time    `json:"employee_signed_at"`
	CreatedAt            time.Time     `json:"created_at"`
	UpdatedAt            time.Time     `json:"updated_at"`
}

func (r *PerformanceReview) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}

type ProfessionalDevelopment struct {
	TenantBase
	ID            uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StaffID       uuid.UUID     `json:"staff_id" gorm:"type:uuid;index;not null"`
	Staff         *StaffProfile `json:"staff,omitempty" gorm:"foreignKey:StaffID"`
	CourseName    string        `json:"course_name" gorm:"not null"`
	Provider      string        `json:"provider"`
	CompletionDate time.Time    `json:"completion_date"`
	Cost          float64       `json:"cost" gorm:"default:0"`
	Status        string        `json:"status" gorm:"default:IN_PROGRESS"` // IN_PROGRESS, COMPLETED, CANCELLED
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

func (pd *ProfessionalDevelopment) BeforeCreate(tx *gorm.DB) (err error) {
	if pd.ID == uuid.Nil {
		pd.ID = uuid.New()
	}
	return
}
