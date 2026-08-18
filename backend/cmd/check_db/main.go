package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Fatal(err)
	}

	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	err = db.Exec("UPDATE tenant_thinkce.teachers SET user_id = '952ad1c9-401a-40fb-8f82-9e67978cbdf8' WHERE id = 'ede7d41a-c206-451e-8305-e5029fefe431'").Error
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Successfully linked teacher to your user id!")
}
