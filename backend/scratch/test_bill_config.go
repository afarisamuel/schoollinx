package main

import (
	"context"
	"fmt"
	"log"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
)

func main() {
	cfg := config.LoadConfig()
	db := infrastructure.ConnectDB(cfg)

	ctx := context.Background()
	var tenant domain.Tenant
	if err := db.Where("subdomain = ? OR schema_name = ?", "kendemy", "tenant_kendemy").First(&tenant).Error; err != nil {
		if err := db.First(&tenant).Error; err != nil {
			log.Fatalf("Tenant not found: %v", err)
		}
	}

	fmt.Printf("Using tenant: %s (schema: %s)\n", tenant.Name, tenant.SchemaName)
	ctx = context.WithValue(ctx, middleware.TenantIDKey, tenant.ID)
	ctx = context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	ctx = context.WithValue(ctx, middleware.TenantNameKey, tenant.Name)

	fiscalRepo := repository.NewFiscalRepository(db)

	cfgLoaded, err := fiscalRepo.GetBillTemplateConfig(ctx)
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}
	fmt.Printf("Initial Config: Title=%s, Items=%d\n", cfgLoaded.Title, len(cfgLoaded.RequiredItems))
	for i, it := range cfgLoaded.RequiredItems {
		fmt.Printf("  [%d] %s: %s (%s)\n", i, it.Category, it.Description, it.Quantity)
	}

	// Try saving a custom config
	cfgLoaded.Title = "TEST CUSTOM BILL TITLE"
	cfgLoaded.RequiredItems = []domain.BillSupplyItem{
		{Category: "BOOKS", Description: "Custom Math Book", Quantity: "2 copies", Note: "Required"},
	}

	err = fiscalRepo.SaveBillTemplateConfig(ctx, cfgLoaded)
	if err != nil {
		log.Fatalf("Error saving config: %v", err)
	}
	fmt.Println("Saved config successfully!")

	// Now re-read
	cfgReLoaded, err := fiscalRepo.GetBillTemplateConfig(ctx)
	if err != nil {
		log.Fatalf("Error reloading config: %v", err)
	}
	fmt.Printf("Reloaded Config: Title=%s, Items=%d\n", cfgReLoaded.Title, len(cfgReLoaded.RequiredItems))
	for i, it := range cfgReLoaded.RequiredItems {
		fmt.Printf("  [%d] %s: %s (%s)\n", i, it.Category, it.Description, it.Quantity)
	}
}
