package main

import (
	"fmt"
	"log"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "postgres://postgres:gentechco@localhost:5432/hsm?sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// 1. Fetch routes from tenant_great.transport_routes
	type Route struct {
		ID   uuid.UUID
		Name string
	}
	var routes []Route
	db.Table("tenant_great.transport_routes").Find(&routes)
	fmt.Printf("Found %d routes in tenant_great:\n", len(routes))
	for _, r := range routes {
		fmt.Printf(" - %s (%s)\n", r.Name, r.ID)
	}

	if len(routes) == 0 {
		fmt.Println("No routes found, creating default routes...")
		// Create default routes
		r1ID := uuid.New()
		db.Exec(`INSERT INTO tenant_great.transport_routes 
			(id, name, vehicle_plate, vehicle_info, driver_name, driver_phone, capacity, is_active, daily_fee, current_lat, current_lng, speed_kmh, heading_deg, next_stop_name, estimated_arrival_mins, created_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
			r1ID, "Route 1: East Legon & Airport Express", "GR 4820-24", "Toyota Coaster (32-Seater • AC)", "Driver Kwame Mensah", "+233 24 411 2233", 32, true, 25.0, 5.6358, -0.1611, 38.5, 45, "Boundary Road Junction", 8)
		
		r2ID := uuid.New()
		db.Exec(`INSERT INTO tenant_great.transport_routes 
			(id, name, vehicle_plate, vehicle_info, driver_name, driver_phone, capacity, is_active, daily_fee, current_lat, current_lng, speed_kmh, heading_deg, next_stop_name, estimated_arrival_mins, created_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
			r2ID, "Route 2: Cantonments & Osu Shuttle", "GW 9182-25", "Mercedes Sprinter (22-Seater)", "Driver Emmanuel Darko", "+233 50 882 1199", 22, true, 30.0, 5.5780, -0.1802, 42.0, 180, "Danquah Circle", 14)

		// Stops for Route 1
		stops1 := []struct {
			name   string
			order  int
			status string
			time   string
		}{
			{"Campus Bus Terminal", 1, "DEPARTED", "03:30 PM"},
			{"Shiashie Flyover", 2, "DEPARTED", "03:45 PM"},
			{"Boundary Road Junction", 3, "NEXT", "03:55 PM"},
			{"A&C Square Roundabout", 4, "UPCOMING", "04:05 PM"},
			{"American House Terminal", 5, "UPCOMING", "04:15 PM"},
		}
		for _, s := range stops1 {
			db.Exec(`INSERT INTO tenant_great.route_stops (id, route_id, name, "order", status, time, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
				uuid.New(), r1ID, s.name, s.order, s.status, s.time)
		}

		// Stops for Route 2
		stops2 := []struct {
			name   string
			order  int
			status string
			time   string
		}{
			{"Campus Bus Terminal", 1, "DEPARTED", "03:30 PM"},
			{"Police Headquarters", 2, "DEPARTED", "03:50 PM"},
			{"Danquah Circle", 3, "NEXT", "04:02 PM"},
			{"Osu Oxford Street Stop", 4, "UPCOMING", "04:12 PM"},
		}
		for _, s := range stops2 {
			db.Exec(`INSERT INTO tenant_great.route_stops (id, route_id, name, "order", status, time, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
				uuid.New(), r2ID, s.name, s.order, s.status, s.time)
		}

		db.Table("tenant_great.transport_routes").Find(&routes)
	}

	// 2. Fetch students
	type Student struct {
		ID uuid.UUID
	}
	var students []Student
	db.Table("tenant_great.students").Limit(5).Find(&students)
	if len(students) > 0 && len(routes) > 0 {
		targetStudent := students[0].ID
		targetRoute := routes[0].ID

		var count int64
		db.Table("tenant_great.bus_assignments").Where("student_id = ?", targetStudent).Count(&count)
		if count == 0 {
			db.Exec(`INSERT INTO tenant_great.bus_assignments (id, student_id, route_id, pick_up, drop_off, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
				uuid.New(), targetStudent, targetRoute, "Boundary Road Junction", "Campus Bus Terminal")
			fmt.Printf("Assigned student %s to route %s\n", targetStudent, targetRoute)
		} else {
			fmt.Printf("Student %s already assigned to a route\n", targetStudent)
		}
	}
}
