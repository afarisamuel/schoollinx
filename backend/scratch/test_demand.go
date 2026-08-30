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
	db.Exec("SET search_path TO tenant_great, public")

	ctx := context.Background()
	intelRepo := repository.NewIntelligenceRepository(db)
	demands, err := intelRepo.GetCourseDemand(ctx)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Computed %d course demands:\n", len(demands))
	for _, d := range demands {
		fmt.Printf("  -> %s: Enrolled: %d | Projected: %d | Shortage: %v\n", d.SubjectName, d.CurrentEnrollment, d.ProjectedDemand, d.TeacherShortage)
	}
}
