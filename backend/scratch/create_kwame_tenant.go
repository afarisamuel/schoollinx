package main

import (
	"log"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := infrastructure.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// 1. Create or ensure tenant_kwame schema exists and run migrations
	log.Println("Migrating schema tenant_kwame...")
	if err := infrastructure.RunTenantMigrations(db, "tenant_kwame"); err != nil {
		log.Fatalf("Failed to migrate tenant_kwame: %v", err)
	}

	// 2. Insert or update tenant in public.tenants
	var existing domain.Tenant
	err = db.Table("public.tenants").Where("subdomain = ?", "kwame").First(&existing).Error
	if err != nil {
		kwameID := uuid.New()
		newTenant := domain.Tenant{
			ID:               kwameID,
			Name:             "Kwame Nkrumah School of Excellence",
			Subdomain:        "kwame",
			SchemaName:       "tenant_kwame",
			IsActive:         true,
			SubscriptionPlan: "PRO",
			StorageLimitGB:   20,
		}
		if err := db.Table("public.tenants").Create(&newTenant).Error; err != nil {
			log.Fatalf("Failed to insert tenant kwame: %v", err)
		}
		log.Printf("Created tenant kwame with ID: %s", kwameID)
	} else {
		log.Printf("Tenant kwame already exists with ID: %s", existing.ID)
	}

	// 3. Ensure admin user exists in tenant_kwame schema
	if err := db.Exec("SET search_path TO tenant_kwame").Error; err != nil {
		log.Fatalf("Failed to set search_path: %v", err)
	}

	var adminUser domain.User
	err = db.Table("tenant_kwame.users").Where("email = ?", "gyenyame190@gmail.com").First(&adminUser).Error
	if err != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
		user := domain.User{
			ID:           uuid.New(),
			Email:        "gyenyame190@gmail.com",
			Username:     "admin_kwame",
			PasswordHash: string(hash),
			Role:         domain.RoleAdmin,
			Status:       "ACTIVE",
		}
		if err := db.Table("tenant_kwame.users").Create(&user).Error; err != nil {
			log.Printf("Warning: failed to create admin user in tenant_kwame: %v", err)
		} else {
			log.Println("Created admin user gyenyame190@gmail.com in tenant_kwame")
		}
	} else {
		log.Println("Admin user gyenyame190@gmail.com already exists in tenant_kwame")
	}

	log.Println("Done successfully!")
}
