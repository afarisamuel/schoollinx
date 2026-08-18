package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GradeCategory distinguishes assessment types for weighted GPA calculations.
type GradeCategory string

const (
	CategoryAssignment GradeCategory = "ASSIGNMENT"
	CategoryQuiz       GradeCategory = "QUIZ"
	CategoryMidterm    GradeCategory = "MIDTERM"
	CategoryFinal      GradeCategory = "FINAL"
)

type Grade struct {
	TenantBase
	ID        uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID uuid.UUID     `json:"student_id" gorm:"type:uuid;not null"`
	Student   *Student      `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	ClassID   uuid.UUID     `json:"class_id" gorm:"type:uuid;not null"`
	Class     *Class        `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Score     float32       `json:"score" gorm:"not null"`
	MaxScore  float32       `json:"max_score" gorm:"default:100"` // denominator for weighting
	Value     float32       `json:"value" gorm:"-"`               // alias for Score in generated reports
	Category  GradeCategory `json:"category" gorm:"type:varchar(20);default:'ASSIGNMENT'"`
	Subject   string        `json:"subject" gorm:"not null"`
	Remarks   string        `json:"remarks"`
	Term      string        `json:"term" gorm:"not null"`
	EditorID  uuid.UUID     `json:"editor_id" gorm:"type:uuid"` // User who last created/updated this grade
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

func (g *Grade) BeforeCreate(tx *gorm.DB) (err error) {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return
}

// GradeWeight defines the contribution of each category to the final weighted GPA.
type GradeWeight struct {
	TenantBase
	ID       uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	ClassID  uuid.UUID     `json:"class_id" gorm:"type:uuid;index;not null"`
	Category GradeCategory `json:"category" gorm:"type:varchar(20);not null"`
	Weight   float32       `json:"weight" gorm:"not null"` // 0.0–1.0, all categories must sum to 1.0
}

func (gw *GradeWeight) BeforeCreate(tx *gorm.DB) (err error) {
	if gw.ID == uuid.Nil {
		gw.ID = uuid.New()
	}
	return
}

// GradeLog records every mutation to a Grade for full accountability.
type GradeLog struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	GradeID   uuid.UUID `json:"grade_id" gorm:"type:uuid;index;not null"`
	EditorID  uuid.UUID `json:"editor_id" gorm:"type:uuid;not null"`
	OldScore  float32   `json:"old_score"`
	NewScore  float32   `json:"new_score"`
	Note      string    `json:"note"`
	ChangedAt time.Time `json:"changed_at"`

	Editor *User `json:"editor,omitempty" gorm:"foreignKey:EditorID"`
}

func (gl *GradeLog) BeforeCreate(tx *gorm.DB) (err error) {
	if gl.ID == uuid.Nil {
		gl.ID = uuid.New()
	}
	return
}

// GradeWeightedGPA is the computed result per student in a class.
type GradeWeightedGPA struct {
	TenantBase
	StudentID   uuid.UUID `json:"student_id"`
	StudentName string    `json:"student_name"`
	GPA         float64   `json:"gpa"` // 0–100 weighted average
}

type GradeRepository interface {
	Create(ctx context.Context, grade *Grade) error
	GetAll(ctx context.Context) ([]Grade, error)
	GetByStudentID(ctx context.Context, studentID uuid.UUID) ([]Grade, error)
	GetByClassID(ctx context.Context, classID uuid.UUID) ([]Grade, error)
	Update(ctx context.Context, grade *Grade) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Phase 18 additions
	GetWeightsByClassID(ctx context.Context, classID uuid.UUID) ([]GradeWeight, error)
	UpsertWeight(ctx context.Context, w *GradeWeight) error
	GetWeightedGPA(ctx context.Context, classID uuid.UUID) ([]GradeWeightedGPA, error)
	CurveGrades(ctx context.Context, classID uuid.UUID, term string, method string, factor float64) error
	LogChange(ctx context.Context, log *GradeLog) error
	GetHistory(ctx context.Context, gradeID uuid.UUID) ([]GradeLog, error)
	BulkCreate(ctx context.Context, grades []Grade) (int, []string, error)

	GetGradeDistribution(ctx context.Context) (map[string]int, error)
	GetStudentGradeAverages(ctx context.Context) ([]StudentGradeAverage, error)
	GetStudentGradeTrajectory(ctx context.Context, studentID uuid.UUID) ([]GradeTrajectoryPoint, error)
}

type StudentGradeAverage struct {
	StudentID uuid.UUID
	Average   float64
}

type GradeTrajectoryPoint struct {
	Subject string    `json:"subject"`
	Date    time.Time `json:"date"`
	Score   float64   `json:"score"`
}

// GradeUseCase remains unchanged for general admin REST handlers.
type GradeUseCase interface {
	AddGrade(ctx context.Context, grade *Grade) error
	GetStudentGrades(ctx context.Context, studentID uuid.UUID) ([]Grade, error)
	GetClassGrades(ctx context.Context, classID uuid.UUID) ([]Grade, error)
	UpdateGrade(ctx context.Context, grade *Grade) error
	DeleteGrade(ctx context.Context, id uuid.UUID) error
	BulkCreateGrades(ctx context.Context, grades []Grade) (int, []string, error)
	GetWeightsByClassID(ctx context.Context, classID uuid.UUID) ([]GradeWeight, error)
	UpsertWeight(ctx context.Context, w *GradeWeight) error
	GetStudentGradeTrajectory(ctx context.Context, studentID uuid.UUID) ([]GradeTrajectoryPoint, error)
}
