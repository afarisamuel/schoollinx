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
	db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;").Scan(&tables)
	fmt.Println("Tables in hsm public schema:")
	for _, t := range tables {
		fmt.Println(" -", t)
	}
}
