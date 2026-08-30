package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "postgres://postgres:gentechco@localhost:5432/hsm?sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var tables []string
	db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'tenant_great' ORDER BY table_name;").Scan(&tables)
	fmt.Println("Tables in tenant_great schema:")
	for _, t := range tables {
		fmt.Println(" -", t)
	}

	// Check transport_routes
	var routeCount int64
	db.Table("tenant_great.transport_routes").Count(&routeCount)
	fmt.Println("transport_routes count in tenant_great:", routeCount)

	var stopCount int64
	db.Table("tenant_great.route_stops").Count(&stopCount)
	fmt.Println("route_stops count in tenant_great:", stopCount)

	type RouteRow struct {
		ID   string
		Name string
	}
	var rRows []RouteRow
	db.Table("tenant_great.transport_routes").Find(&rRows)
	for _, r := range rRows {
		fmt.Printf(" Route: %s (%s)\n", r.Name, r.ID)
	}

	return

	type Student struct {
		ID        string
		FirstName string
		LastName  string
	}
	var students []Student
	db.Table("tenant_great.students").Find(&students)
	for _, s := range students {
		fmt.Printf(" Student: %s %s (%s)\n", s.FirstName, s.LastName, s.ID)
	}
}
