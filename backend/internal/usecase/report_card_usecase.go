package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ReportCardUseCase struct {
	repo domain.ReportCardRepository
}

func NewReportCardUseCase(repo domain.ReportCardRepository) *ReportCardUseCase {
	return &ReportCardUseCase{repo: repo}
}

func (u *ReportCardUseCase) CreateTemplate(ctx context.Context, tmpl *domain.ReportCardTemplate) error {
	return u.repo.CreateTemplate(ctx, tmpl)
}

func (u *ReportCardUseCase) ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportCardTemplate, error) {
	return u.repo.ListTemplates(ctx, tenantID)
}

func (u *ReportCardUseCase) GenerateReportCard(ctx context.Context, rc *domain.ReportCard) error {
	rc.Status = domain.ReportStatusDraft

	// Generate cryptographic verification hash if not present
	if rc.VerificationHash == "" {
		rc.VerificationHash = u.GenerateVerificationHash(rc.StudentID, rc.ID, rc.OverallScore)
	}

	return u.repo.CreateReportCard(ctx, rc)
}

func (u *ReportCardUseCase) GetStudentReports(ctx context.Context, studentID uuid.UUID) ([]*domain.ReportCard, error) {
	return u.repo.ListReportCardsByStudent(ctx, studentID)
}

func (u *ReportCardUseCase) PublishReport(ctx context.Context, reportID uuid.UUID, pdfURL string) error {
	return u.repo.UpdateReportCardStatus(ctx, reportID, domain.ReportStatusPublished, &pdfURL)
}

// GenerateAIRemarks builds contextual, positive, and constructive terminal remarks
func (u *ReportCardUseCase) GenerateAIRemarks(studentName string, gpa float64, attendancePct float64, topSubject, lowSubject string) string {
	var performanceTone string
	switch {
	case gpa >= 85:
		performanceTone = fmt.Sprintf("%s has exhibited exemplary academic diligence this term, consistently producing top-tier scholarship.", studentName)
	case gpa >= 70:
		performanceTone = fmt.Sprintf("%s has maintained commendable academic focus, demonstrating sound understanding of core concepts.", studentName)
	case gpa >= 55:
		performanceTone = fmt.Sprintf("%s shows steady potential, though targeted review of foundational topics will elevate performance.", studentName)
	default:
		performanceTone = fmt.Sprintf("%s would benefit significantly from structured remedial sessions and consistent home revision routines.", studentName)
	}

	var subjectNote string
	if topSubject != "" && lowSubject != "" && topSubject != lowSubject {
		subjectNote = fmt.Sprintf("Outstanding aptitude was observed in %s; continued encouragement in %s will produce well-rounded outcomes.", topSubject, lowSubject)
	} else if topSubject != "" {
		subjectNote = fmt.Sprintf("Demonstrated exceptional enthusiasm and mastery in %s.", topSubject)
	}

	var attendanceNote string
	switch {
	case attendancePct >= 95:
		attendanceNote = "Punctuality and attendance have been impeccable, reinforcing strong classroom engagement."
	case attendancePct >= 80:
		attendanceNote = "Attendance has been satisfactory throughout the period."
	default:
		attendanceNote = "Improving attendance will directly support academic continuity and assessment performance."
	}

	if subjectNote != "" {
		return fmt.Sprintf("%s %s %s", performanceTone, subjectNote, attendanceNote)
	}
	return fmt.Sprintf("%s %s", performanceTone, attendanceNote)
}

// GenerateVerificationHash creates a unique SHA-256 fingerprint for public transcript verification
func (u *ReportCardUseCase) GenerateVerificationHash(studentID, reportID uuid.UUID, score float64) string {
	raw := fmt.Sprintf("%s:%s:%.2f:%d", studentID.String(), reportID.String(), score, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

// VerifyTranscript retrieves report card by its verification hash for external validation
func (u *ReportCardUseCase) VerifyTranscript(ctx context.Context, hash string) (*domain.ReportCard, error) {
	return u.repo.GetReportCardByVerificationHash(ctx, hash)
}

// Competency Rubrics
func (u *ReportCardUseCase) CreateRubric(ctx context.Context, rubric *domain.CompetencyRubric) error {
	return u.repo.CreateRubric(ctx, rubric)
}

func (u *ReportCardUseCase) ListRubrics(ctx context.Context, tenantID uuid.UUID) ([]*domain.CompetencyRubric, error) {
	return u.repo.ListRubrics(ctx, tenantID)
}

func (u *ReportCardUseCase) SaveEvaluation(ctx context.Context, eval *domain.CompetencyEvaluation) error {
	return u.repo.SaveEvaluation(ctx, eval)
}

func (u *ReportCardUseCase) ListStudentEvaluations(ctx context.Context, studentID, periodID uuid.UUID) ([]*domain.CompetencyEvaluation, error) {
	return u.repo.ListStudentEvaluations(ctx, studentID, periodID)
}

// IEP Special Needs
func (u *ReportCardUseCase) CreateIEPPlan(ctx context.Context, plan *domain.IEPPlan) error {
	return u.repo.CreateIEPPlan(ctx, plan)
}

func (u *ReportCardUseCase) GetStudentIEP(ctx context.Context, studentID uuid.UUID) (*domain.IEPPlan, error) {
	return u.repo.GetStudentIEP(ctx, studentID)
}

func (u *ReportCardUseCase) AddIEPMilestone(ctx context.Context, m *domain.IEPMilestone) error {
	return u.repo.AddIEPMilestone(ctx, m)
}

func (u *ReportCardUseCase) UpdateIEPMilestone(ctx context.Context, id uuid.UUID, achieved bool, notes string) error {
	return u.repo.UpdateIEPMilestone(ctx, id, achieved, notes)
}
