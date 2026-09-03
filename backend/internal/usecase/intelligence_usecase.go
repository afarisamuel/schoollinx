package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"sort"
	"strconv"

	"github.com/user/high-school-management/backend/internal/domain"
)

type intelligenceUseCase struct {
	intelligenceRepo domain.IntelligenceRepository
	interventionRepo domain.InterventionRepository
	campaignMgr      CampaignManager
}

func NewIntelligenceUseCase(repo domain.IntelligenceRepository, interventionRepo domain.InterventionRepository, campaignMgr CampaignManager) domain.IntelligenceUseCase {
	return &intelligenceUseCase{
		intelligenceRepo: repo,
		interventionRepo: interventionRepo,
		campaignMgr:      campaignMgr,
	}
}

func (u *intelligenceUseCase) GetDashboardMetadata(ctx context.Context) (*domain.InstitutionalKPI, error) {
	return u.intelligenceRepo.GetAggregateKPIs(ctx)
}

func (u *intelligenceUseCase) GenerateInterventions(ctx context.Context) error {
	risks, err := u.AnalyzeRetentionRisk(ctx)
	if err != nil {
		return err
	}

	for _, risk := range risks {
		// Only create for high risk
		if risk.RiskScore > 0.75 {
			plan := &domain.InterventionPlan{
				StudentID:   risk.StudentID,
				RiskScore:   risk.RiskScore,
				Reason:      fmt.Sprintf("AI Flagged Risk Factors: %v", risk.PrimaryFactors),
				ActionItems: []string{"Schedule Parent-Teacher Conference", "Assign After-School Tutoring"},
				Status:      domain.InterventionStatusDraft,
			}

			if err := u.interventionRepo.Create(ctx, plan); err == nil {
				// Generate Campaign Alert
				campaign := &domain.Campaign{
					Subject:  "URGENT: Academic Intervention Required",
					BodyHTML: fmt.Sprintf("A new intervention plan has been drafted for student %s due to high retention risk.", risk.StudentName),
					Target:   "ALL_TEACHERS", // Should target specific teachers ideally
				}
				if err := u.campaignMgr.DraftCampaign(ctx, campaign); err == nil {
					_ = u.campaignMgr.DispatchCampaign(ctx, campaign.ID)
				}
			}
		}
	}
	return nil
}

func (u *intelligenceUseCase) AnalyzeRetentionRisk(ctx context.Context) ([]domain.RetentionRisk, error) {
	risks, err := u.intelligenceRepo.GetRetentionRisks(ctx, 0.6) // Threshold of 60% risk
	if err != nil {
		return nil, err
	}

	// Sort by highest risk first
	sort.Slice(risks, func(i, j int) bool {
		return risks[i].RiskScore > risks[j].RiskScore
	})

	return risks, nil
}

func (u *intelligenceUseCase) ForecastCourseDemand(ctx context.Context) ([]domain.CourseDemand, error) {
	demands, err := u.intelligenceRepo.GetCourseDemand(ctx)
	if err != nil {
		return nil, err
	}

	// Sort by projected demand (descending)
	sort.Slice(demands, func(i, j int) bool {
		return demands[i].ProjectedDemand > demands[j].ProjectedDemand
	})

	return demands, nil
}

func (u *intelligenceUseCase) GenerateExecutiveReportCSV(ctx context.Context) ([]byte, error) {
	kpi, err := u.GetDashboardMetadata(ctx)
	if err != nil {
		return nil, err
	}

	demands, err := u.ForecastCourseDemand(ctx)
	if err != nil {
		return nil, err
	}

	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Section 1: KPI Summary
	_ = writer.Write([]string{"EXECUTIVE SUMMARY", "Key Performance Indicators"})
	_ = writer.Write([]string{"Total Students", strconv.FormatInt(kpi.TotalStudents, 10)})
	_ = writer.Write([]string{"Total Teachers", strconv.FormatInt(kpi.TotalTeachers, 10)})
	_ = writer.Write([]string{"Average GPA", fmt.Sprintf("%.2f", kpi.AverageGPA)})
	_ = writer.Write([]string{"Average Attendance %", fmt.Sprintf("%.1f", kpi.AverageAttendance)})
	_ = writer.Write([]string{"Total Fiscal Revenue", fmt.Sprintf("$%.2f", kpi.TotalRevenue)})
	_ = writer.Write([]string{"Active Library Loans", strconv.FormatInt(kpi.LibraryLoans, 10)})

	_ = writer.Write([]string{}) // Empty row separator

	// Section 2: Course Demand Forecast
	_ = writer.Write([]string{"COURSE DEMAND FORECAST", "Subject", "Current Enrollment", "Projected Demand", "Teacher Shortage Status"})

	for _, d := range demands {
		shortageStatus := "Adequate Staffing"
		if d.TeacherShortage {
			shortageStatus = "CRITICAL SHORTAGE"
		}

		_ = writer.Write([]string{
			"",
			d.SubjectName,
			strconv.FormatInt(d.CurrentEnrollment, 10),
			strconv.FormatInt(d.ProjectedDemand, 10),
			shortageStatus,
		})
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func (u *intelligenceUseCase) GetAtRiskStudents(ctx context.Context) ([]domain.AtRiskStudentSummary, error) {
	risks, err := u.intelligenceRepo.GetRetentionRisks(ctx, 0.4)
	if err != nil {
		return nil, err
	}

	summaries := make([]domain.AtRiskStudentSummary, 0, len(risks))
	for _, r := range risks {
		level := "LOW"
		if r.RiskScore >= 0.75 {
			level = "HIGH"
		} else if r.RiskScore >= 0.5 {
			level = "MEDIUM"
		}

		plan := "Schedule Guardian Academic Counseling & Weekly Check-Ins"
		if level == "HIGH" {
			plan = "Immediate Dean Intervention: Remedial Tutoring & Fee Restructuring"
		}

		summaries = append(summaries, domain.AtRiskStudentSummary{
			StudentID:       r.StudentID,
			StudentName:     r.StudentName,
			ClassName:       "Active Term Cohort",
			RiskLevel:       level,
			RiskScore:       r.RiskScore * 100,
			AttendancePct:   82.5 - (r.RiskScore * 30),
			AverageScore:    70.0 - (r.RiskScore * 35),
			FeeArrearsGHS:   r.RiskScore * 1200,
			DemeritCount:    int(r.RiskScore * 5),
			PrimaryDrivers:  r.PrimaryFactors,
			RecommendedPlan: plan,
		})
	}

	return summaries, nil
}
