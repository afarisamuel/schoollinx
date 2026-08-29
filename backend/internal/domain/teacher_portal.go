package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SeatingChart represents a 2D classroom seating plan (Feature 2)
type SeatingChart struct {
	TenantBase
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ClassID    uuid.UUID `json:"class_id" gorm:"type:uuid;not null;index"`
	Name       string    `json:"name" gorm:"type:varchar(100);not null"`
	Rows       int       `json:"rows" gorm:"default:5"`
	Columns    int       `json:"columns" gorm:"default:6"`
	LayoutJSON string    `json:"layout_json" gorm:"type:text"` // JSON array of {desk: 1, row: 0, col: 0, student_id: uuid}
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// LessonPlan represents a structured weekly scheme of work (Feature 1)
type LessonPlan struct {
	TenantBase
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TeacherID    uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null;index"`
	ClassID      uuid.UUID `json:"class_id" gorm:"type:uuid;not null;index"`
	SubjectID    uuid.UUID `json:"subject_id" gorm:"type:uuid;not null;index"`
	WeekNumber   int       `json:"week_number" gorm:"not null"`
	Term         string    `json:"term" gorm:"type:varchar(50);not null"`
	Topic        string    `json:"topic" gorm:"type:varchar(255);not null"`
	Objectives   string    `json:"objectives" gorm:"type:text"`
	Competencies string    `json:"competencies" gorm:"type:text"` // National curriculum standards
	Activities   string    `json:"activities" gorm:"type:text"`
	Homework     string    `json:"homework" gorm:"type:text"`
	Status       string    `json:"status" gorm:"default:'DRAFT'"` // DRAFT, SUBMITTED, APPROVED
	Feedback     string    `json:"feedback" gorm:"type:text"`     // Head of Department review comments
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// GradingRubric represents a multi-criteria scoring grid for SpeedGrader (Feature 10)
type GradingRubric struct {
	TenantBase
	ID          uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Title       string            `json:"title" gorm:"type:varchar(200);not null"`
	Description string            `json:"description" gorm:"type:text"`
	SubjectID   *uuid.UUID        `json:"subject_id,omitempty" gorm:"type:uuid"`
	Criteria    []RubricCriterion `json:"criteria,omitempty" gorm:"foreignKey:RubricID"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// RubricCriterion is a single dimension within a rubric (e.g. "Clarity", "Grammar")
type RubricCriterion struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RubricID    uuid.UUID `json:"rubric_id" gorm:"type:uuid;not null;index"`
	Title       string    `json:"title" gorm:"type:varchar(150);not null"`
	MaxScore    float64   `json:"max_score" gorm:"not null"`
	Weight      float64   `json:"weight" gorm:"default:1.0"`
	LevelsJSON  string    `json:"levels_json" gorm:"type:text"` // Array of {title, points, description}
	CreatedAt   time.Time `json:"created_at"`
}

// SickbayReferral is a digital referral ticket sent from classroom to infirmary (Feature 22)
type SickbayReferral struct {
	TenantBase
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	StudentID    uuid.UUID  `json:"student_id" gorm:"type:uuid;not null;index"`
	TeacherID    uuid.UUID  `json:"teacher_id" gorm:"type:uuid;not null;index"`
	Symptoms     string     `json:"symptoms" gorm:"type:text;not null"`
	Severity     string     `json:"severity" gorm:"default:'NORMAL'"` // NORMAL, URGENT, EMERGENCY
	ReferralTime time.Time  `json:"referral_time"`
	Status       string     `json:"status" gorm:"default:'PENDING'"` // PENDING, ADMITTED, DISCHARGED
	NurseNotes   string     `json:"nurse_notes" gorm:"type:text"`
	DischargedAt *time.Time `json:"discharged_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

// TeacherResource represents learning materials shared with students (Feature 3)
type TeacherResource struct {
	TenantBase
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TeacherID   uuid.UUID  `json:"teacher_id" gorm:"type:uuid;not null;index"`
	ClassID     uuid.UUID  `json:"class_id" gorm:"type:uuid;not null;index"`
	Title       string     `json:"title" gorm:"type:varchar(200);not null"`
	Description string     `json:"description" gorm:"type:text"`
	FileURL     string     `json:"file_url" gorm:"type:text;not null"`
	FileType    string     `json:"file_type"` // PDF, VIDEO, SLIDES, DOC
	ReleaseDate *time.Time `json:"release_date"`
	CreatedAt   time.Time  `json:"created_at"`
}

type TeacherPortalRepository interface {
	// Seating Charts
	GetSeatingChart(ctx context.Context, classID uuid.UUID) (*SeatingChart, error)
	SaveSeatingChart(ctx context.Context, chart *SeatingChart) error

	// Lesson Plans
	GetLessonPlans(ctx context.Context, teacherID, classID uuid.UUID) ([]LessonPlan, error)
	CreateLessonPlan(ctx context.Context, plan *LessonPlan) error
	UpdateLessonPlan(ctx context.Context, plan *LessonPlan) error

	// Rubrics
	GetRubrics(ctx context.Context) ([]GradingRubric, error)
	CreateRubric(ctx context.Context, rubric *GradingRubric) error

	// Sickbay Referral Tickets
	CreateSickbayReferral(ctx context.Context, referral *SickbayReferral) error
	GetClassReferrals(ctx context.Context, classID uuid.UUID) ([]SickbayReferral, error)

	// Teacher Resources
	CreateResource(ctx context.Context, res *TeacherResource) error
	GetClassResources(ctx context.Context, classID uuid.UUID) ([]TeacherResource, error)
}
