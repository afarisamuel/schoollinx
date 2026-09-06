package infrastructure

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// RunMigrations applies migrations to the global (public) schema,
// and then applies them to every active tenant schema.
func RunMigrations(db *gorm.DB) error {
	// 0. Ensure payment_transactions table and columns exist cleanly without invalid cross-schema foreign keys
	_ = db.Exec(`ALTER TABLE public.payment_transactions ALTER COLUMN fiscal_record_id DROP NOT NULL`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions ALTER COLUMN payer_id DROP NOT NULL`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_fiscal_record_id_not_null`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_payer_id_not_null`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_payment_transactions_fiscal_record CASCADE`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_payment_transactions_payer CASCADE`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_public_payment_transactions_fiscal_record CASCADE`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS fk_public_payment_transactions_payer CASCADE`).Error
	_ = db.Exec(`ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS student_id uuid`).Error

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

	// Run within a transaction so GORM pins a single connection,
	// ensuring SET search_path strictly applies to all AutoMigrate operations.
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SET search_path TO " + schemaName).Error; err != nil {
			return fmt.Errorf("failed to set search path for %s: %w", schemaName, err)
		}

		if err := tx.AutoMigrate(TenantModels...); err != nil {
			return fmt.Errorf("failed to auto migrate models for %s: %w", schemaName, err)
		}

		// Allow class_id to be NULL for general/school-wide default grading weights
		_ = tx.Exec("ALTER TABLE grade_weights ALTER COLUMN class_id DROP NOT NULL").Error
		_ = tx.Exec("ALTER TABLE grade_weights DROP CONSTRAINT IF EXISTS grade_weights_class_id_category_key").Error
		_ = tx.Exec("ALTER TABLE grade_weights DROP CONSTRAINT IF EXISTS grade_weights_class_id_fkey").Error
		_ = tx.Exec("ALTER TABLE grades ALTER COLUMN category TYPE VARCHAR(100)").Error

		return nil
	})
}

func getTenantSchemas(db *gorm.DB) ([]string, error) {
	schemaMap := make(map[string]bool)

	// 1. From public.tenants table
	var count int64
	_ = db.Table("information_schema.tables").
		Where("table_schema = ? AND table_name = ?", "public", "tenants").
		Count(&count).Error

	if count > 0 {
		var tenantSchemas []string
		_ = db.Table("public.tenants").
			Where("schema_name IS NOT NULL AND schema_name != ''").
			Pluck("schema_name", &tenantSchemas).Error
		for _, s := range tenantSchemas {
			if s != "" {
				schemaMap[s] = true
			}
		}
	}

	// 2. Discover all tenant schemas directly from PostgreSQL (e.g. tenant_great, tenant_kwame)
	var dbSchemas []string
	_ = db.Raw("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'").
		Pluck("schema_name", &dbSchemas).Error
	for _, s := range dbSchemas {
		if s != "" {
			schemaMap[s] = true
		}
	}

	schemas := make([]string, 0, len(schemaMap))
	for s := range schemaMap {
		schemas = append(schemas, s)
	}

	return schemas, nil
}
