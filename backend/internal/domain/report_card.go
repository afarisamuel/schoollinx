package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type ReportCardTemplate struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	LayoutJSON  string    `json:"layout_json" gorm:"type:jsonb;not null"` // Definition of the drag-and-drop layout
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ReportCardStatus string

const (
	ReportStatusDraft     ReportCardStatus = "DRAFT"
	ReportStatusGenerated ReportCardStatus = "GENERATED"
	ReportStatusPublished ReportCardStatus = "PUBLISHED"
)

type ReportCard struct {
	ID                 uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID           uuid.UUID        `json:"tenant_id" gorm:"type:uuid;index;not null"`
	StudentID          uuid.UUID        `json:"student_id" gorm:"type:uuid;index;not null"`
	AcademicPeriodID   uuid.UUID        `json:"academic_period_id" gorm:"type:uuid;index;not null"`
	TemplateID         uuid.UUID        `json:"template_id" gorm:"type:uuid;not null"`
	Status             ReportCardStatus `json:"status" gorm:"type:varchar(20);not null;default:'DRAFT'"`
	RenderedData       string           `json:"rendered_data" gorm:"type:jsonb"` // The baked JSON payload representing the report data
	AIGeneratedRemarks string           `json:"ai_generated_remarks" gorm:"type:text"`
	VerificationHash   string           `json:"verification_hash" gorm:"type:varchar(64);index"` // SHA-256 hash for public transcript verification
	QRSignature        string           `json:"qr_signature" gorm:"type:text"`
	OverallScore       float64          `json:"overall_score" gorm:"default:0"`
	AttendanceRate     float64          `json:"attendance_rate" gorm:"default:0"`
	PDFURL             *string          `json:"pdf_url"` // S3 or local path to the generated PDF
	GeneratedAt        *time.Time       `json:"generated_at"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
}

// Competency-Based Evaluation (CBA / NaCCA)
type CompetencyRubric struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	Name        string    `json:"name" gorm:"not null"`        // e.g., "Critical Thinking & Problem Solving"
	Domain      string    `json:"domain" gorm:"not null"`      // e.g., "Core Competencies", "Practical Skills"
	Description string    `json:"description"`
	ScaleMin    int       `json:"scale_min" gorm:"default:1"`
	ScaleMax    int       `json:"scale_max" gorm:"default:5"`
	LevelsJSON  string    `json:"levels_json" gorm:"type:jsonb"` // Novice, Developing, Proficient, Exemplary
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CompetencyEvaluation struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	StudentID   uuid.UUID `json:"student_id" gorm:"type:uuid;index;not null"`
	RubricID    uuid.UUID `json:"rubric_id" gorm:"type:uuid;index;not null"`
	PeriodID    uuid.UUID `json:"period_id" gorm:"type:uuid;index;not null"`
	TeacherID   uuid.UUID `json:"teacher_id" gorm:"type:uuid;index;not null"`
	Score       int       `json:"score" gorm:"not null"` // 1-5
	TeacherNote string    `json:"teacher_note"`
	Rubric      *CompetencyRubric `json:"rubric,omitempty" gorm:"foreignKey:RubricID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Individualized Education Plan (IEP) for Special Needs Tracking
type IEPPlan struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;index;not null"`
	StudentID      uuid.UUID `json:"student_id" gorm:"type:uuid;index;not null"`
	CounselorID    uuid.UUID `json:"counselor_id" gorm:"type:uuid;not null"`
	Diagnosis      string    `json:"diagnosis" gorm:"not null"`
	Accommodations string    `json:"accommodations"` // e.g. "Extended exam time (25%), Visual cues"
	Goals          string    `json:"goals"`
	Status         string    `json:"status" gorm:"default:'ACTIVE'"` // ACTIVE, REVIEW_DUE, ARCHIVED
	ReviewDate     time.Time `json:"review_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Milestones     []IEPMilestone `json:"milestones,omitempty" gorm:"foreignKey:PlanID"`
}

type IEPMilestone struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	PlanID      uuid.UUID  `json:"plan_id" gorm:"type:uuid;index;not null"`
	Title       string     `json:"title" gorm:"not null"`
	TargetDate  time.Time  `json:"target_date"`
	Achieved    bool       `json:"achieved" gorm:"default:false"`
	AchievedAt  *time.Time `json:"achieved_at"`
	Notes       string     `json:"notes"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ReportCardRepository interface {
	CreateTemplate(ctx context.Context, tmpl *ReportCardTemplate) error
	GetTemplate(ctx context.Context, id uuid.UUID) (*ReportCardTemplate, error)
	ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]*ReportCardTemplate, error)

	CreateReportCard(ctx context.Context, rc *ReportCard) error
	GetReportCard(ctx context.Context, id uuid.UUID) (*ReportCard, error)
	GetReportCardByVerificationHash(ctx context.Context, hash string) (*ReportCard, error)
	ListReportCardsByStudent(ctx context.Context, studentID uuid.UUID) ([]*ReportCard, error)
	UpdateReportCardStatus(ctx context.Context, id uuid.UUID, status ReportCardStatus, pdfURL *string) error

	// Competencies
	CreateRubric(ctx context.Context, rubric *CompetencyRubric) error
	ListRubrics(ctx context.Context, tenantID uuid.UUID) ([]*CompetencyRubric, error)
	SaveEvaluation(ctx context.Context, eval *CompetencyEvaluation) error
	ListStudentEvaluations(ctx context.Context, studentID, periodID uuid.UUID) ([]*CompetencyEvaluation, error)

	// IEP
	CreateIEPPlan(ctx context.Context, plan *IEPPlan) error
	GetStudentIEP(ctx context.Context, studentID uuid.UUID) (*IEPPlan, error)
	AddIEPMilestone(ctx context.Context, m *IEPMilestone) error
	UpdateIEPMilestone(ctx context.Context, id uuid.UUID, achieved bool, notes string) error
}
