// @title           School Linx Reporting System API
// @version         1.0
// @description     Professional High School Management System Backend API.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api

package main

import (
	"log"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/app"
)

func main() {
	cfg := config.LoadConfig()

	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	application := app.NewApp(cfg)
	application.Bootstrap()
	application.Run()
}
