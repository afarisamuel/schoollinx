package infrastructure

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// RunMigrations applies migrations to the global (public) schema,
// and then applies them to every active tenant schema.
func RunMigrations(db *gorm.DB) error {
	// 1. Run migrations for the public schema (global tables)
	log.Println("Running migrations for public schema")
	if err := db.AutoMigrate(GlobalModels...); err != nil {
		return fmt.Errorf("failed to migrate public schema: %w", err)
	}

	// 2. Fetch all known tenant schemas
	schemas, err := getTenantSchemas(db)
	if err != nil {
		return fmt.Errorf("failed to fetch tenant schemas: %w", err)
	}

	// 3. Run migrations for each tenant schema
	for _, schema := range schemas {
		log.Printf("Running migrations for tenant schema: %s", schema)
		if err := RunTenantMigrations(db, schema); err != nil {
			return fmt.Errorf("failed to migrate tenant schema %s: %w", schema, err)
		}
	}

	log.Println("All migrations applied successfully.")
	return nil
}

// RunTenantMigrations applies migrations for a specific tenant schema
func RunTenantMigrations(db *gorm.DB, schemaName string) error {
	// Execute schema creation if it doesn't exist
	if err := db.Exec("CREATE SCHEMA IF NOT EXISTS " + schemaName).Error; err != nil {
		return fmt.Errorf("failed to create schema %s: %w", schemaName, err)
	}

	// Create a new session to ensure search_path only affects this transaction/session
	session := db.Session(&gorm.Session{})
	
	if err := session.Exec("SET search_path TO " + schemaName).Error; err != nil {
		return fmt.Errorf("failed to set search path for %s: %w", schemaName, err)
	}

	if err := session.AutoMigrate(TenantModels...); err != nil {
		return fmt.Errorf("failed to auto migrate models for %s: %w", schemaName, err)
	}

	// Reset search path
	if err := session.Exec("SET search_path TO public").Error; err != nil {
		return fmt.Errorf("failed to reset search path: %w", err)
	}

	return nil
}

func getTenantSchemas(db *gorm.DB) ([]string, error) {
	// Ensure the tenants table exists before querying
	var count int64
	err := db.Table("information_schema.tables").
		Where("table_schema = ? AND table_name = ?", "public", "tenants").
		Count(&count).Error
	if err != nil {
		return nil, err
	}
	if count == 0 {
		return nil, nil // No tenants yet
	}

	var schemas []string
	err = db.Table("tenants").
		Where("schema_name IS NOT NULL AND is_active = true").
		Pluck("schema_name", &schemas).Error

	return schemas, err
}
