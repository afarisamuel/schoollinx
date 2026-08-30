package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load(".env")
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:gentechco@localhost:5432/hsm?sslmode=disable"
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}

	var routeCount int64
	db.Table("transport_routes").Count(&routeCount)
	fmt.Printf("Transport routes count in public: %d\n", routeCount)

	// Check tenants
	type Tenant struct {
		ID       string
		Name     string
		Domain   string
		DBSchema string
	}
	var tenants []Tenant
	db.Table("tenants").Find(&tenants)
	for _, t := range tenants {
		fmt.Printf("Tenant: %s, Domain: %s, Schema: %s\n", t.Name, t.Domain, t.DBSchema)
		if t.DBSchema != "" {
			var count int64
			db.Table(fmt.Sprintf("%s.transport_routes", t.DBSchema)).Count(&count)
			fmt.Printf("  Routes in schema %s: %d\n", t.DBSchema, count)

			type Route struct {
				ID   string
				Name string
			}
			var routes []Route
			db.Table(fmt.Sprintf("%s.transport_routes", t.DBSchema)).Find(&routes)
			for _, r := range routes {
				fmt.Printf("    Route: %s (%s)\n", r.Name, r.ID)
			}
		}
	}
}
