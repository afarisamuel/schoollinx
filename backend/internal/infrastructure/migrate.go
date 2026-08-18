package infrastructure

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	// Import the migrations directory
	"github.com/user/high-school-management/backend/migrations"
)

// RunMigrations applies pending migrations to the global (public) schema,
// and then applies them to every active tenant schema.
func RunMigrations(db *sql.DB, databaseURL string) error {
	// 1. Run migrations for the public schema (global tables)
	if err := runMigrationsForSchema(db, "public", databaseURL); err != nil {
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
		if err := runMigrationsForSchema(db, schema, databaseURL); err != nil {
			return fmt.Errorf("failed to migrate tenant schema %s: %w", schema, err)
		}
	}

	log.Println("All migrations applied successfully.")
	return nil
}

// RunTenantMigrations applies migrations for a specific tenant schema (e.g., during onboarding)
func RunTenantMigrations(db *sql.DB, schemaName string, databaseURL string) error {
	return runMigrationsForSchema(db, schemaName, databaseURL)
}

func runMigrationsForSchema(db *sql.DB, schemaName string, databaseURL string) error {
	// Create source driver from embedded filesystem
	sourceDriver, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to create iofs source driver: %w", err)
	}

	// Create database driver
	// Pass the DSN directly to golang-migrate to enforce search_path at the connection level
	dsn := databaseURL
	if schemaName != "" && schemaName != "public" {
		if strings.Contains(dsn, "?") {
			dsn = dsn + "&search_path=" + schemaName
		} else {
			dsn = dsn + "?search_path=" + schemaName
		}
	}

	m, err := migrate.NewWithSourceInstance(
		"iofs",
		sourceDriver,
		dsn,
	)
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	// Apply migrations
	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration up failed: %w", err)
	}

	return nil
}

func getTenantSchemas(db *sql.DB) ([]string, error) {
	// Ensure the tenants table exists before querying
	// The public schema migration will create it if it doesn't, so this is safe assuming public ran first.
	var count int
	err := db.QueryRow("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants'").Scan(&count)
	if err != nil {
		return nil, err
	}
	if count == 0 {
		return nil, nil // No tenants yet
	}

	rows, err := db.Query("SELECT schema_name FROM tenants WHERE schema_name IS NOT NULL AND is_active = true")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schemas []string
	for rows.Next() {
		var schema string
		if err := rows.Scan(&schema); err != nil {
			return nil, err
		}
		schemas = append(schemas, schema)
	}

	return schemas, rows.Err()
}

// ForceMigrationVersion forces the schema_migrations to a specific version,
// clearing the dirty flag. Applies to both public and all tenant schemas.
func ForceMigrationVersion(db *sql.DB, version int, databaseURL string) error {
	// Force public schema
	if err := forceVersionForSchema(db, "public", version, databaseURL); err != nil {
		return fmt.Errorf("failed to force public schema: %w", err)
	}
	log.Printf("  ✓ public schema forced to version %d", version)

	// Force all tenant schemas
	schemas, err := getTenantSchemas(db)
	if err != nil {
		return fmt.Errorf("failed to fetch tenant schemas: %w", err)
	}
	for _, schema := range schemas {
		if err := forceVersionForSchema(db, schema, version, databaseURL); err != nil {
			return fmt.Errorf("failed to force tenant schema %s: %w", schema, err)
		}
		log.Printf("  ✓ tenant schema %s forced to version %d", schema, version)
	}

	return nil
}

func forceVersionForSchema(db *sql.DB, schemaName string, version int, databaseURL string) error {
	sourceDriver, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to create iofs source driver: %w", err)
	}

	dsn := databaseURL
	if schemaName != "" && schemaName != "public" {
		if strings.Contains(dsn, "?") {
			dsn = dsn + "&search_path=" + schemaName
		} else {
			dsn = dsn + "?search_path=" + schemaName
		}
	}

	m, err := migrate.NewWithSourceInstance("iofs", sourceDriver, dsn)
	if err != nil {
		return fmt.Errorf("failed to initialize migrate instance: %w", err)
	}

	if err := m.Force(version); err != nil {
		return fmt.Errorf("force version failed: %w", err)
	}

	return nil
}
