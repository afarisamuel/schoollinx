package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/utils"
)

func main() {
	godotenv.Load()
	cfg := config.LoadConfig()
	db, _ := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})

	var u domain.User
	db.Table("tenant_great.users").First(&u)

	token, err := utils.GenerateToken(&u, cfg)
	if err != nil {
		fmt.Println("Token error:", err)
		return
	}
	fmt.Printf("Generated token for user %s (%s)\n", u.ID, u.Role)

	req, _ := http.NewRequest("GET", "http://localhost:8080/api/notifications?limit=50", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Tenant-Subdomain", "great")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Req err:", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Status: %d\nBody: %s\n", resp.StatusCode, string(body))
}
