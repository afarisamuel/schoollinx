package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

type AnalyticsUseCase struct {
	attendanceRepo domain.AttendanceRepository
	gradeRepo      domain.GradeRepository
	studentRepo    domain.StudentRepository
	facilityRepo   domain.FacilityRepository
	pdfService     *pdf.PDFService
}

func NewAnalyticsUseCase(
	attendanceRepo domain.AttendanceRepository,
	gradeRepo domain.GradeRepository,
	studentRepo domain.StudentRepository,
	facilityRepo domain.FacilityRepository,
	pdfService *pdf.PDFService,
) *AnalyticsUseCase {
	return &AnalyticsUseCase{
		attendanceRepo: attendanceRepo,
		gradeRepo:      gradeRepo,
		studentRepo:    studentRepo,
		facilityRepo:   facilityRepo,
		pdfService:     pdfService,
	}
}

type AttendanceStats struct {
	Present int `json:"present"`
	Absent  int `json:"absent"`
	Tardy   int `json:"tardy"`
}

func (u *AnalyticsUseCase) GetAttendanceStats(ctx context.Context) (AttendanceStats, error) {
	statsMap, err := u.attendanceRepo.GetAttendanceStats(ctx)
	if err != nil {
		return AttendanceStats{}, fmt.Errorf("failed to get attendance stats: %w", err)
	}

	return AttendanceStats{
		Present: statsMap["Present"],
		Absent:  statsMap["Absent"],
		Tardy:   statsMap["Tardy"],
	}, nil
}

type GradeDistribution struct {
	Label string  `json:"name"`
	Value float64 `json:"value"`
}

func (u *AnalyticsUseCase) GetGradeDistribution(ctx context.Context) ([]GradeDistribution, error) {
	distMap, err := u.gradeRepo.GetGradeDistribution(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get grade distribution: %w", err)
	}

	return []GradeDistribution{
		{Label: "A", Value: float64(distMap["A"])},
		{Label: "B", Value: float64(distMap["B"])},
		{Label: "C", Value: float64(distMap["C"])},
		{Label: "D", Value: float64(distMap["D"])},
		{Label: "F", Value: float64(distMap["F"])},
	}, nil
}

func (u *AnalyticsUseCase) GetAtRiskStudents(ctx context.Context) ([]domain.RiskAlert, error) {
	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get students: %w", err)
	}

	gradeAvgs, err := u.gradeRepo.GetStudentGradeAverages(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get grade averages: %w", err)
	}

	attendanceStats, err := u.attendanceRepo.GetStudentAttendanceStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance stats: %w", err)
	}

	gradeMap := make(map[uuid.UUID]float64)
	for _, g := range gradeAvgs {
		gradeMap[g.StudentID] = g.Average
	}

	attendanceMap := make(map[uuid.UUID]float64)
	for _, a := range attendanceStats {
		if a.Total > 0 {
			attendanceMap[a.StudentID] = float64(a.Present) / float64(a.Total) * 100
		} else {
			attendanceMap[a.StudentID] = 100
		}
	}

	var alerts []domain.RiskAlert

	for _, student := range students {
		gradeAvg, hasGrades := gradeMap[student.ID]
		attendancePct, hasAttendance := attendanceMap[student.ID]
		if !hasAttendance {
			attendancePct = 100
		}
		if !hasGrades {
			gradeAvg = 100
		}

		// Weighted risk score (0–100, higher = more at risk)
		// Attendance = 40%, Grades = 40%, Conduct proxy (if grade avg < 50 and attendance < 70) = 20%
		attendanceRisk := 0.0
		if attendancePct < 100 {
			attendanceRisk = ((100 - attendancePct) / 100) * 100
		}

		gradeRisk := 0.0
		if gradeAvg < 100 {
			gradeRisk = ((100 - gradeAvg) / 100) * 100
		}

		conductRisk := 0.0
		if gradeAvg < 50 && attendancePct < 70 {
			conductRisk = 80 // High conduct risk proxy
		} else if gradeAvg < 65 && attendancePct < 80 {
			conductRisk = 40
		}

		riskScore := float32((attendanceRisk * 0.4) + (gradeRisk * 0.4) + (conductRisk * 0.2))

		var reasons []string
		riskLevel := domain.RiskLevelLow

		if attendancePct < 70 {
			reasons = append(reasons, fmt.Sprintf("Critical attendance: %.1f%%", attendancePct))
			riskLevel = domain.RiskLevelHigh
		} else if attendancePct < 80 {
			reasons = append(reasons, fmt.Sprintf("Low attendance: %.1f%%", attendancePct))
			if riskLevel == domain.RiskLevelLow {
				riskLevel = domain.RiskLevelMedium
			}
		}

		if hasGrades {
			if gradeAvg < 65 {
				reasons = append(reasons, fmt.Sprintf("Failing grade average: %.1f", gradeAvg))
				riskLevel = domain.RiskLevelHigh
			} else if gradeAvg < 75 {
				reasons = append(reasons, fmt.Sprintf("Below average grades: %.1f", gradeAvg))
				if riskLevel == domain.RiskLevelLow {
					riskLevel = domain.RiskLevelMedium
				}
			}
		}

		if riskScore > 30 {
			alerts = append(alerts, domain.RiskAlert{
				StudentID:     student.ID,
				StudentName:   fmt.Sprintf("%s %s", student.FirstName, student.LastName),
				Level:         riskLevel,
				GradeAvg:      float32(gradeAvg),
				AttendancePct: float32(attendancePct),
				RiskScore:     riskScore,
				Reasons:       reasons,
			})
		}
	}

	// Sort by risk score descending
	for i := 0; i < len(alerts); i++ {
		for j := i + 1; j < len(alerts); j++ {
			if alerts[j].RiskScore > alerts[i].RiskScore {
				alerts[i], alerts[j] = alerts[j], alerts[i]
			}
		}
	}

	return alerts, nil
}

// DetectAttendanceAnomalies flags students with unusual attendance patterns
func (u *AnalyticsUseCase) DetectAttendanceAnomalies(ctx context.Context) ([]domain.AttendanceAnomaly, error) {
	attendanceStats, err := u.attendanceRepo.GetStudentAttendanceStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance stats: %w", err)
	}

	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get students: %w", err)
	}

	studentNameMap := make(map[uuid.UUID]string)
	for _, s := range students {
		studentNameMap[s.ID] = fmt.Sprintf("%s %s", s.FirstName, s.LastName)
	}

	var anomalies []domain.AttendanceAnomaly

	for _, stat := range attendanceStats {
		if stat.Total == 0 {
			continue
		}

		attendancePct := float64(stat.Present) / float64(stat.Total) * 100
		name := studentNameMap[stat.StudentID]
		if name == "" {
			name = stat.StudentID.String()[:8]
		}

		// Flag critical absences (< 70%)
		if attendancePct < 70 {
			anomalies = append(anomalies, domain.AttendanceAnomaly{
				StudentID:    stat.StudentID,
				StudentName:  name,
				AnomalyType:  "CRITICAL_ABSENCE",
				Description:  fmt.Sprintf("Attendance critically low at %.1f%% (%d/%d days present)", attendancePct, stat.Present, stat.Total),
				DateDetected: "Recent",
				Severity:     domain.RiskLevelHigh,
			})
		} else if stat.Total > 0 && (stat.Total-stat.Present) >= 3 {
			// 3 or more absences is notable even if overall % is not terrible
			absent := stat.Total - stat.Present
			anomalies = append(anomalies, domain.AttendanceAnomaly{
				StudentID:    stat.StudentID,
				StudentName:  name,
				AnomalyType:  "CONSECUTIVE_ABSENCE",
				Description:  fmt.Sprintf("Student has %d recorded absences (%.1f%% attendance)", absent, attendancePct),
				DateDetected: "Recent",
				Severity:     domain.RiskLevelMedium,
			})
		}
	}

	return anomalies, nil
}

type HeatmapData struct {
	ResourceName string `json:"resource_name"`
	DayOfWeek    string `json:"day_of_week"`
	HourOfDay    int    `json:"hour_of_day"`
	UsagePercent int    `json:"usage_percent"`
}

func (u *AnalyticsUseCase) GetResourceHeatmap(ctx context.Context) ([]HeatmapData, error) {
	if u.facilityRepo == nil {
		return []HeatmapData{}, nil
	}
	heatmaps, err := u.facilityRepo.GetResourceHeatmap(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get facility heatmap: %w", err)
	}

	days := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
	var results []HeatmapData
	for _, h := range heatmaps {
		dayName := "Unknown"
		if h.DayOfWeek >= 0 && h.DayOfWeek < len(days) {
			dayName = days[h.DayOfWeek]
		}
		results = append(results, HeatmapData{
			ResourceName: h.RoomName,
			DayOfWeek:    dayName,
			HourOfDay:    h.HourOfDay,
			UsagePercent: h.Utilization,
		})
	}
	return results, nil
}

type DemographicsStats struct {
	TotalStudents int `json:"total_students"`
	Male          int `json:"male"`
	Female        int `json:"female"`
	Other         int `json:"other"`
	Active        int `json:"active"`
	Alumni        int `json:"alumni"`
	Withdrawn     int `json:"withdrawn"`
}

func (u *AnalyticsUseCase) GetDemographics(ctx context.Context) (DemographicsStats, error) {
	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return DemographicsStats{}, fmt.Errorf("failed to fetch students: %w", err)
	}

	stats := DemographicsStats{
		TotalStudents: len(students),
	}

	for _, s := range students {
		// Gender
		switch s.Gender {
		case "Male", "MALE", "M":
			stats.Male++
		case "Female", "FEMALE", "F":
			stats.Female++
		default:
			stats.Other++
		}

		// Status
		switch s.Status {
		case domain.StatusActive:
			stats.Active++
		case domain.StatusAlumni:
			stats.Alumni++
		case domain.StatusWithdrawn:
			stats.Withdrawn++
		}
	}

	return stats, nil
}

// GenerateExecutiveReport assembles executive stats and generates a PDF
func (u *AnalyticsUseCase) GenerateExecutiveReport(
	ctx context.Context,
	demographics DemographicsStats,
	attendance AttendanceStats,
	riskAlerts []domain.RiskAlert,
) ([]byte, error) {
	atRiskCount := len(riskAlerts)
	highRiskCount := 0
	var topRisks []string

	for _, r := range riskAlerts {
		if r.Level == domain.RiskLevelHigh {
			highRiskCount++
		}
		if len(topRisks) < 5 {
			topRisks = append(topRisks, fmt.Sprintf("%s (Score: %.0f, Attendance: %.1f%%)", r.StudentName, r.RiskScore, r.AttendancePct))
		}
	}

	stats := pdf.ExecutiveStats{
		TotalStudents: demographics.TotalStudents,
		Active:        demographics.Active,
		AttendPresent: attendance.Present,
		AttendAbsent:  attendance.Absent,
		AttendTardy:   attendance.Tardy,
		AtRiskCount:   atRiskCount,
		HighRiskCount: highRiskCount,
		TopRisks:      topRisks,
	}

	return u.pdfService.GenerateExecutiveReportPDF(stats)
}
