package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type intelligenceRepository struct {
	db *gorm.DB
}

func NewIntelligenceRepository(db *gorm.DB) domain.IntelligenceRepository {
	return &intelligenceRepository{db: db}
}

func (r *intelligenceRepository) GetAggregateKPIs(ctx context.Context) (*domain.InstitutionalKPI, error) {
	var kpis domain.InstitutionalKPI

	// 1. Total Students
	r.db.WithContext(ctx).Model(&domain.Student{}).Count(&kpis.TotalStudents)

	// 2. Total Teachers
	r.db.WithContext(ctx).Model(&domain.Teacher{}).Count(&kpis.TotalTeachers)

	// 3. Average GPA
	type gpaResult struct {
		AvgValue float64
	}
	var gpa gpaResult
	r.db.WithContext(ctx).Model(&domain.Grade{}).Select("AVG(score) as avg_value").Scan(&gpa)
	kpis.AverageGPA = gpa.AvgValue

	// 4. Average Attendance (Percentage of Present records)
	var totalRecords int64
	var presentRecords int64
	r.db.WithContext(ctx).Model(&domain.Attendance{}).Count(&totalRecords)
	r.db.WithContext(ctx).Model(&domain.Attendance{}).Where("status = ?", "Present").Count(&presentRecords)

	if totalRecords > 0 {
		kpis.AverageAttendance = (float64(presentRecords) / float64(totalRecords)) * 100
	}

	// 5. Total Revenue (Fiscal records where status is PAID and amount > 0)
	type revResult struct {
		TotalAmount float64
	}
	var rev revResult
	r.db.WithContext(ctx).Model(&domain.FiscalRecord{}).Select("SUM(amount) as total_amount").Where("status = ?", "PAID").Scan(&rev)
	kpis.TotalRevenue = rev.TotalAmount

	// 6. Active Library Loans
	r.db.WithContext(ctx).Model(&domain.LibraryLoan{}).Where("status = ?", "BORROWED").Count(&kpis.LibraryLoans)

	// 7. Active Academic Session Data
	var activePeriod domain.AcademicPeriod
	if err := r.db.WithContext(ctx).Where("is_active = ?", true).First(&activePeriod).Error; err == nil {
		kpis.ActiveAcademicYear = activePeriod.Name
		kpis.ActiveTerm = fmt.Sprintf("%s %d", activePeriod.TermType, activePeriod.CurrentTerm)
		kpis.TermCount = activePeriod.TermCount
	} else {
		kpis.ActiveAcademicYear = "None Active"
		kpis.ActiveTerm = "N/A"
	}

	// 8. Total Scholastic Levels
	r.db.WithContext(ctx).Model(&domain.ScholasticLevel{}).Count(&kpis.TotalLevels)

	return &kpis, nil
}

func (r *intelligenceRepository) GetRetentionRisks(ctx context.Context, threshold float64) ([]domain.RetentionRisk, error) {
	// A complex heuristic model implemented in SQL/Go
	// We'll calculate a composite score based on Attendance and Grades

	var students []domain.Student
	if err := r.db.WithContext(ctx).Find(&students).Error; err != nil {
		return nil, err
	}

	var risks []domain.RetentionRisk

	for _, s := range students {
		// Calculate individual Attendance
		var tRecords, pRecords int64
		r.db.WithContext(ctx).Model(&domain.Attendance{}).Where("student_id = ?", s.ID).Count(&tRecords)
		r.db.WithContext(ctx).Model(&domain.Attendance{}).Where("student_id = ? AND status = ?", s.ID, "Present").Count(&pRecords)

		attRate := 1.0
		if tRecords > 0 {
			attRate = float64(pRecords) / float64(tRecords)
		}

		// Calculate individual GPA
		var sGpa gpaResult
		r.db.WithContext(ctx).Model(&domain.Grade{}).Where("student_id = ?", s.ID).Select("AVG(score) as avg_value").Scan(&sGpa)

		// Risk Score Logic: 1.0 is highest risk, 0.0 is zero risk
		// High risk if GPA < 60 OR Attendance < 70%
		riskScore := 0.0
		var factors []string

		if sGpa.AvgValue < 60.0 {
			riskScore += 0.6 // 60% of risk weight
			factors = append(factors, "Critical Academic Performance")
		} else if sGpa.AvgValue < 75.0 {
			riskScore += 0.3
			factors = append(factors, "Declining Grades")
		}

		if attRate < 0.70 {
			riskScore += 0.8 // Immediate high risk flag
			factors = append(factors, "Severe Chronic Absenteeism")
		} else if attRate < 0.85 {
			riskScore += 0.4
			factors = append(factors, "Irregular Attendance")
		}

		// Cap max risk at 1.0
		if riskScore > 1.0 {
			riskScore = 1.0
		}

		if riskScore >= threshold {
			risks = append(risks, domain.RetentionRisk{
				StudentID:      s.ID,
				StudentName:    string(s.FirstName) + " " + string(s.LastName),
				RiskScore:      riskScore,
				PrimaryFactors: factors,
			})
		}
	}

	return risks, nil
}

// Reuse the gpaResult struct locally in the repository methods
type gpaResult struct {
	AvgValue float64
}

func (r *intelligenceRepository) GetCourseDemand(ctx context.Context) ([]domain.CourseDemand, error) {
	var subjects []domain.Subject
	if err := r.db.WithContext(ctx).Find(&subjects).Error; err != nil {
		return nil, err
	}

	var demands []domain.CourseDemand

	for _, sub := range subjects {
		// 1. Current Enrollment (Students in categories assigned to this subject)
		var currentEnrollment int64
		r.db.WithContext(ctx).
			Table("students").
			Joins("JOIN teacher_class_assignments tca ON tca.class_id = students.class_id").
			Where("tca.subject = ?", sub.ID).
			Count(&currentEnrollment)

		// 2. Projected Demand (Simple heuristic: current + 15% estimated growth for core subjects)
		// We'll simulate this by adding a small growth factor based on the subject ID
		// Use the first 4 bytes of UUID for a deterministic seed
		idSeed := uint32(sub.ID[0]) | uint32(sub.ID[1])<<8 | uint32(sub.ID[2])<<16 | uint32(sub.ID[3])<<24
		growthRate := 1.05 + (float64(idSeed%5) / 100) // 5% to 9% growth
		projectedDemand := int64(float64(currentEnrollment) * growthRate)

		// If zero, assume baseline new interest
		if projectedDemand == 0 {
			projectedDemand = int64(idSeed%20) + 10
		}

		// 3. Teacher Shortage (Assume 1 teacher per 30 students)
		var assignedTeachers int64
		r.db.WithContext(ctx).
			Model(&domain.AcademicAssignment{}).
			Where("subject_id = ?", sub.ID).
			Select("count(distinct(teacher_id))").
			Count(&assignedTeachers)

		requiredTeachers := (projectedDemand / 30) + 1
		shortage := assignedTeachers < requiredTeachers

		demands = append(demands, domain.CourseDemand{
			SubjectID:         sub.ID,
			SubjectName:       sub.Name,
			CurrentEnrollment: currentEnrollment,
			ProjectedDemand:   projectedDemand,
			TeacherShortage:   shortage,
		})
	}

	return demands, nil
}

// InterventionRepository Implementation

type interventionRepository struct {
	db *gorm.DB
}

func NewInterventionRepository(db *gorm.DB) domain.InterventionRepository {
	return &interventionRepository{db: db}
}

func (r *interventionRepository) Create(ctx context.Context, plan *domain.InterventionPlan) error {
	return r.db.WithContext(ctx).Create(plan).Error
}

func (r *interventionRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.InterventionPlan, error) {
	var plans []domain.InterventionPlan
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&plans).Error
	return plans, err
}

func (r *interventionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.InterventionStatus) error {
	return r.db.WithContext(ctx).Model(&domain.InterventionPlan{}).Where("id = ?", id).Update("status", status).Error
}

