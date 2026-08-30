package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"github.com/user/high-school-management/backend/internal/usecase"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load("/home/afari/Projects/development/basic-sms/backend/.env")
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	db.Exec("SET search_path TO tenant_great, public")

	ctx := context.Background()
	attRepo := repository.NewAttendanceRepository(db)
	gradeRepo := repository.NewGradeRepository(db)
	studentRepo := repository.NewStudentRepository(db)

	analyticsUC := usecase.NewAnalyticsUseCase(attRepo, gradeRepo, studentRepo, nil)

	risks, err := analyticsUC.GetAtRiskStudents(ctx)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Computed %d at-risk students.\n", len(risks))
	for i, r := range risks {
		if i >= 5 {
			break
		}
		fmt.Printf("  -> %s | Level: %s | Score: %.1f | Reasons: %v\n", r.StudentName, r.Level, r.RiskScore, r.Reasons)
	}
}
