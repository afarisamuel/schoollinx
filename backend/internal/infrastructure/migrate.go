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

	// Drop unique constraint on users.phone_number — multiple guardians can share a phone number
	_ = db.Exec(`ALTER TABLE public.users DROP CONSTRAINT IF EXISTS uni_users_phone_number`).Error
	_ = db.Exec(`DROP INDEX IF EXISTS public.uni_users_phone_number`).Error

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

		// Fee structures column and index enhancements
		_ = tx.Exec("ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS all_classes BOOLEAN DEFAULT TRUE").Error
		_ = tx.Exec("ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_ids TEXT[]").Error
		_ = tx.Exec("ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'TERMLY'").Error
		_ = tx.Exec("ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_term_fee BOOLEAN DEFAULT TRUE").Error
		_ = tx.Exec("ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_academic_period_id_category_key").Error
		_ = tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_structures_period_cat_active ON fee_structures (academic_period_id, category) WHERE deleted_at IS NULL").Error

		// Student columns (family, health, placement)
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_phone TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_email TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS father_occupation TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_phone TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_email TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_occupation TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_relation TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS health_conditions TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS allergies TEXT").Error
		_ = tx.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group TEXT").Error
		_ = tx.Exec("UPDATE students SET enrollment_num = 'STU-' || EXTRACT(YEAR FROM created_at)::text || '-' || UPPER(SUBSTRING(id::text, 1, 6)) WHERE enrollment_num IS NULL OR enrollment_num = ''").Error

		// Guardians enhancements
		_ = tx.Exec("ALTER TABLE guardians ALTER COLUMN user_id DROP NOT NULL").Error
		_ = tx.Exec("ALTER TABLE guardians ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE").Error
		_ = tx.Exec("ALTER TABLE guardians ADD COLUMN IF NOT EXISTS can_pickup BOOLEAN DEFAULT TRUE").Error
		_ = tx.Exec("ALTER TABLE guardians ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(20)").Error

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
