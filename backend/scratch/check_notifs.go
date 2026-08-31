package main

import (
	"fmt"
	"os"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/internal/domain"
)

func main() {
	godotenv.Load()
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
	if err != nil {
		fmt.Println("DB error:", err)
		return
	}

	var count int64
	db.Table("tenant_great.notifications").Count(&count)
	fmt.Printf("tenant_great.notifications count: %d\n", count)

	var notifs []domain.Notification
	db.Table("tenant_great.notifications").Find(&notifs)
	fmt.Printf("notifs count retrieved: %d\n", len(notifs))
	for _, n := range notifs {
		fmt.Printf("ID: %s, UserID: %s, Title: %s, Message: %s, Read: %v\n", n.ID, n.UserID, n.Title, n.Message, n.Read)
	}

	var users []domain.User
	db.Table("tenant_great.users").Find(&users)
	fmt.Println("--- USERS in tenant_great ---")
	for _, u := range users {
		fmt.Printf("User: ID=%s Role=%s Email=%s\n", u.ID, u.Role, u.Email)
	}
}
