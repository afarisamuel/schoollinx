package main

import (
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load("/home/afari/Projects/development/basic-sms/backend/.env")
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	var teachers []struct{ ID uuid.UUID }
	var classes []struct{ ID uuid.UUID }
	var subjects []struct {
		ID   uuid.UUID
		Name string
	}

	db.Raw("SELECT id FROM tenant_great.teachers").Scan(&teachers)
	db.Raw("SELECT id FROM tenant_great.classes").Scan(&classes)
	db.Raw("SELECT id, name FROM tenant_great.subjects").Scan(&subjects)

	for i, sub := range subjects {
		tIdx := i % len(teachers)
		cIdx := i % len(classes)
		db.Exec(`
			INSERT INTO tenant_great.teacher_class_assignments (id, teacher_id, class_id, subject, academic_year, created_at)
			VALUES (?, ?, ?, ?, '2026/2027 Academic Year', NOW())
		`, uuid.New(), teachers[tIdx].ID, classes[cIdx].ID, sub.ID)
	}

	fmt.Println("Inserted teacher class assignments.")
}
