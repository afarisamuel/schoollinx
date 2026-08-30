package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"github.com/user/high-school-management/backend/internal/usecase"
)

func main() {
	cfg := config.LoadConfig()
	db := infrastructure.ConnectDB(cfg)

	ctx := context.Background()
	var tenant domain.Tenant
	if err := db.Where("schema_name = ?", "tenant_great").First(&tenant).Error; err != nil {
		log.Fatalf("Tenant not found: %v", err)
	}

	ctx = context.WithValue(ctx, middleware.TenantIDKey, tenant.ID)
	ctx = context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	ctx = context.WithValue(ctx, middleware.TenantNameKey, tenant.Name)

	studentRepo := repository.NewStudentRepository(db)
	fiscalRepo := repository.NewFiscalRepository(db)
	academicRepo := repository.NewAcademicPeriodRepository(db)
	tenantRepo := repository.NewTenantRepository(db)

	students, err := studentRepo.GetAll(ctx)
	if err != nil || len(students) == 0 {
		log.Fatalf("No students found: %v", err)
	}
	student := students[0]
	fmt.Printf("Generating bill for student: %s %s (Class Level: %d)\n", student.FirstName, student.LastName, student.Level)

	donationRepo := repository.NewDonationRepository(db)
	commRepo := repository.NewCommunicationRepository(db)

	fiscalUC := usecase.NewFiscalUseCase(fiscalRepo, studentRepo, donationRepo, academicRepo, tenantRepo, commRepo, nil)

	pdfBytes, err := fiscalUC.GeneratePupilBill(ctx, student.ID)
	if err != nil {
		log.Fatalf("Failed to generate bill: %v", err)
	}

	outPath := "scratch/new_pupil_bill.pdf"
	if err := os.WriteFile(outPath, pdfBytes, 0644); err != nil {
		log.Fatalf("Failed to write output PDF: %v", err)
	}
	fmt.Printf("Successfully generated %s (%d bytes)!\n", outPath, len(pdfBytes))
}
