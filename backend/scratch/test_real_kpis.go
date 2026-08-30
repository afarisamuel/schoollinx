package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load("/home/afari/Projects/development/basic-sms/backend/.env")
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	// Switch search_path to tenant_great
	db.Exec("SET search_path TO tenant_great, public")

	ctx := context.Background()
	intelRepo := repository.NewIntelligenceRepository(db)

	kpi, err := intelRepo.GetAggregateKPIs(ctx)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("\n=== REAL AGGREGATE KPIS ===\n")
	fmt.Printf("Total Students: %d\n", kpi.TotalStudents)
	fmt.Printf("Total Teachers: %d\n", kpi.TotalTeachers)
	fmt.Printf("Total Guardians: %d\n", kpi.TotalGuardians)
	fmt.Printf("Average GPA / Score: %.2f\n", kpi.AverageGPA)
	fmt.Printf("Average Attendance: %.1f%%\n", kpi.AverageAttendance)
	fmt.Printf("Total Revenue (PAID): GH₵ %.2f\n", kpi.TotalRevenue)
	fmt.Printf("Active Library Loans: %d\n", kpi.LibraryLoans)
	fmt.Printf("Academic Year: %s\n", kpi.ActiveAcademicYear)
	fmt.Printf("Active Term: %s\n", kpi.ActiveTerm)

	// Analytics
	attRepo := repository.NewAttendanceRepository(db)
	attStats, _ := attRepo.GetAttendanceStats(ctx)
	fmt.Printf("\n=== REAL ATTENDANCE STATS ===\n")
	fmt.Printf("Present: %d, Absent: %d, Tardy: %d\n", attStats["Present"], attStats["Absent"], attStats["Tardy"])

	gradeRepo := repository.NewGradeRepository(db)
	grades, _ := gradeRepo.GetGradeDistribution(ctx)
	fmt.Printf("\n=== REAL GRADE DISTRIBUTION ===\n")
	for k, v := range grades {
		fmt.Printf("Grade %s: %d\n", k, v)
	}
}
