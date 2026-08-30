package main

import (
	"context"
	"fmt"
	"log"

	"github.com/user/high-school-management/backend/internal/infrastructure"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "postgres://postgres:gentechco@localhost:5432/hsm?sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	infrastructure.RegisterTenantCallbacks(db)

	repo := repository.NewIntelligenceRepository(db)

	ctx := context.WithValue(context.Background(), "tenant_schema", "tenant_great")

	kpi, err := repo.GetAggregateKPIs(ctx)
	if err != nil {
		fmt.Printf("GetAggregateKPIs ERROR: %v\n", err)
	} else {
		fmt.Printf("KPIs result: %+v\n", *kpi)
	}

	// Also check raw counts on tenant_great
	var sCount, tCount, gCount, cCount int64
	db.Table("tenant_great.students").Count(&sCount)
	db.Table("tenant_great.teachers").Count(&tCount)
	db.Table("tenant_great.guardians").Count(&gCount)
	db.Table("tenant_great.classes").Count(&cCount)
	fmt.Printf("Raw tenant_great counts: students=%d, teachers=%d, guardians=%d, classes=%d\n", sCount, tCount, gCount, cCount)

	// Check public counts
	var psCount, ptCount int64
	db.Table("public.students").Count(&psCount)
	db.Table("public.teachers").Count(&ptCount)
	fmt.Printf("Raw public counts: students=%d, teachers=%d\n", psCount, ptCount)
}
