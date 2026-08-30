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
	db, _ := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})

	var studentIDs []uuid.UUID
	db.Raw("SELECT id FROM tenant_great.students ORDER BY created_at ASC LIMIT 6").Scan(&studentIDs)

	for i, sid := range studentIDs {
		// Update their grades to lower scores (38 - 52)
		db.Exec("UPDATE tenant_great.grades SET score = ? WHERE student_id = ?", 38.0+float64(i*2), sid)
		// Update their attendance records to Absent
		db.Exec("UPDATE tenant_great.attendances SET status = 'Absent' WHERE student_id = ?", sid)
	}

	fmt.Printf("Adjusted 6 students to reflect real academic intervention cases.\n")
}
