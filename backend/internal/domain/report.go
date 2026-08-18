package domain

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentType string

const (
	DocTranscript            DocumentType = "TRANSCRIPT"
	DocEnrollmentCertificate DocumentType = "ENROLLMENT_CERTIFICATE"
	DocConductReport         DocumentType = "CONDUCT_REPORT"
	DocStudentIDCard         DocumentType = "STUDENT_ID_CARD"
	DocTerminalReport        DocumentType = "TERMINAL_REPORT"
)

type ReportMetadata struct {
	TenantBase
	GeneratedBy  string `json:"generated_by"`
	AcademicYear string `json:"academic_year"`
}

// TerminalEvaluation stores the end-of-term conduct and remarks for a student
type TerminalEvaluation struct {
	TenantBase
	ID                 uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	StudentID          uuid.UUID `json:"student_id" gorm:"type:uuid;not null;uniqueIndex:idx_student_period_term"`
	AcademicPeriodID   uuid.UUID `json:"academic_period_id" gorm:"type:uuid;not null;uniqueIndex:idx_student_period_term"`
	TermID             uuid.UUID `json:"term_id" gorm:"type:uuid;not null;uniqueIndex:idx_student_period_term"`
	Conduct            string    `json:"conduct"`
	Attitude           string    `json:"attitude"`
	Interest           string    `json:"interest"`
	ClassTeacherRemark string    `json:"class_teacher_remark"`
	HeadTeacherRemark  string    `json:"head_teacher_remark"`
}

func (te *TerminalEvaluation) BeforeCreate(tx *gorm.DB) (err error) {
	if te.ID == uuid.Nil {
		te.ID = uuid.New()
	}
	return
}

type TerminalEvaluationRepository interface {
	Upsert(ctx context.Context, eval *TerminalEvaluation) error
	GetByStudentAndTerm(ctx context.Context, studentID uuid.UUID, periodID uuid.UUID, termID uuid.UUID) (*TerminalEvaluation, error)
}

type TerminalEvaluationUseCase interface {
	SaveEvaluation(ctx context.Context, eval *TerminalEvaluation) error
	GetEvaluation(ctx context.Context, studentID uuid.UUID, periodID uuid.UUID, termID uuid.UUID) (*TerminalEvaluation, error)
}
