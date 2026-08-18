package usecase

import (
	"context"
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type academicUseCase struct {
	gradeRepo      domain.GradeRepository
	attendanceRepo domain.AttendanceRepository
	studentRepo    domain.StudentRepository
	subjectRepo    domain.SubjectRepository
	fiscalRepo     domain.FiscalRepository
}

func NewAcademicUseCase(
	grepo domain.GradeRepository,
	arepo domain.AttendanceRepository,
	srepo domain.StudentRepository,
	subrepo domain.SubjectRepository,
	frepo domain.FiscalRepository,
) domain.AcademicUseCase {
	return &academicUseCase{
		gradeRepo:      grepo,
		attendanceRepo: arepo,
		studentRepo:    srepo,
		subjectRepo:    subrepo,
		fiscalRepo:     frepo,
	}
}

func (u *academicUseCase) GetStudentInsights(ctx context.Context, studentID uuid.UUID) ([]domain.AcademicInsight, error) {
	insights := []domain.AcademicInsight{}

	// 1. Success Score Analysis
	score, err := u.GetSuccessScore(ctx, studentID)
	if err == nil {
		if score.RiskLevel == "High" {
			insights = append(insights, domain.AcademicInsight{
				Type:            domain.TypeRiskIntervention,
				Title:           "Urgent: Academic Intervention Required",
				Description:     "Your current attendance and grade trends indicate a high risk of academic failure.",
				ConfidenceScore: 0.95,
				Reasoning:       fmt.Sprintf("Attendance: %.1f%%, GPA: %.1f", score.AttendanceRate*100, score.GPA),
			})
		}
	}

	// 2. Subject Recommendation Logic (Simplified)
	grades, _ := u.gradeRepo.GetByStudentID(ctx, studentID)
	subjectPerformance := make(map[string]float64)
	for _, g := range grades {
		subjectPerformance[g.Subject] = (subjectPerformance[g.Subject] + float64(g.Score)) / 2
	}

	// Suggest subjects in categories where student excels
	for subName, avg := range subjectPerformance {
		if avg > 85 {
			insights = append(insights, domain.AcademicInsight{
				Type:            domain.TypeEnrichment,
				Title:           fmt.Sprintf("Unlock Advanced %s Potential", subName),
				Description:     fmt.Sprintf("Based on your excellent performance in %s, we recommend exploring advanced modules or related extracurricular clubs.", subName),
				ConfidenceScore: 0.88,
				Reasoning:       fmt.Sprintf("Consistent performance (>85%%) across related assessments."),
			})
			break // Limit for now
		}
	}

	return insights, nil
}

func (u *academicUseCase) GetSuccessScore(ctx context.Context, studentID uuid.UUID) (*domain.StudentSuccessScore, error) {
	// Calculate GPA
	grades, _ := u.gradeRepo.GetByStudentID(ctx, studentID)
	var totalGrade float64
	if len(grades) > 0 {
		for _, g := range grades {
			totalGrade += float64(g.Score)
		}
		totalGrade /= float64(len(grades))
	} else {
		totalGrade = 0
	}

	// Calculate Attendance Rate
	attendance, _ := u.attendanceRepo.GetByStudent(ctx, studentID)
	var presentCount int
	if len(attendance) > 0 {
		for _, a := range attendance {
			if a.Status == domain.StatusPresent {
				presentCount++
			}
		}
	}
	attendanceRate := 0.0
	if len(attendance) > 0 {
		attendanceRate = float64(presentCount) / float64(len(attendance))
	}

	// Fiscal Risk: Check if student has outstanding fee balance
	var feeDebt float64
	var reasons []string
	records, err := u.fiscalRepo.GetByStudent(ctx, studentID)
	if err == nil {
		for _, r := range records {
			if r.Status != domain.PaymentStatusPaid {
				feeDebt += r.BalanceDue
			}
		}
	}

	// Build risk reasons
	if attendanceRate < 0.75 {
		reasons = append(reasons, fmt.Sprintf("Low attendance: %.1f%%", attendanceRate*100))
	}
	if totalGrade > 0 && totalGrade < 50 {
		reasons = append(reasons, fmt.Sprintf("Below average grades: %.1f%%", totalGrade))
	}
	if feeDebt > 0 {
		reasons = append(reasons, fmt.Sprintf("Outstanding fee balance: %.2f", feeDebt))
	}

	// Composite Score: 50% Grades + 35% Attendance + 15% Fiscal health
	fiscalScore := 100.0
	if feeDebt > 0 {
		fiscalScore = 0.0 // Penalize for any outstanding fees
	}
	composite := (totalGrade * 0.50) + (attendanceRate * 100 * 0.35) + (fiscalScore * 0.15)

	risk := "Low"
	if composite < 50 || attendanceRate < 0.75 {
		risk = "High"
	} else if composite < 70 || feeDebt > 0 {
		risk = "Medium"
	}

	// Fetch Student info for name
	student, _ := u.studentRepo.GetByID(ctx, studentID)
	firstName := ""
	lastName := ""
	if student != nil {
		firstName = string(student.FirstName)
		lastName = string(student.LastName)
	}

	return &domain.StudentSuccessScore{
		StudentID:      studentID,
		FirstName:      firstName,
		LastName:       lastName,
		GPA:            totalGrade,
		AttendanceRate: attendanceRate,
		CompositeScore: composite,
		RiskLevel:      risk,
		FeeDebt:        feeDebt,
		Reasons:        reasons,
	}, nil
}

func (u *academicUseCase) GetAtRiskStudents(ctx context.Context) ([]domain.StudentSuccessScore, error) {
	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	atRisk := []domain.StudentSuccessScore{}
	for _, s := range students {
		score, err := u.GetSuccessScore(ctx, s.ID)
		if err == nil && (score.RiskLevel == "High" || score.RiskLevel == "Medium") {
			atRisk = append(atRisk, *score)
		}
	}

	// Sort by highest risk first
	sort.Slice(atRisk, func(i, j int) bool {
		return atRisk[i].CompositeScore < atRisk[j].CompositeScore
	})

	return atRisk, nil
}

func (u *academicUseCase) RefreshAcademicInsights(ctx context.Context) error {
	// Internal logic to pre-calculate and cache insights if needed
	return nil
}
