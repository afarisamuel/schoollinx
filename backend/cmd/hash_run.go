package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash := "$2b$14$gx5w3tgk2HaxBBqP9Jkh7uiRRTf2umt9QCOLqrS6m9zQ60jQODtay"
	password := "Softivite419@"
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	fmt.Println("Error:", err)
}
