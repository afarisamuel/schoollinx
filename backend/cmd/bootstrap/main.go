package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"github.com/user/high-school-management/backend/pkg/utils"
	"golang.org/x/term"
)

func main() {
	cfg := config.LoadConfig()

	// Default database URL for local development
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = "host=localhost user=postgres password=gentechco dbname=hsm port=5432 sslmode=disable TimeZone=UTC"
	}

	db := infrastructure.ConnectDB(cfg)
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("============================================")
	fmt.Println("  Ecopower Super Admin Setup")
	fmt.Println("============================================")
	fmt.Println()

	// --- Email ---
	var email string
	for {
		fmt.Print("Email address: ")
		input, _ := reader.ReadString('\n')
		email = strings.TrimSpace(input)
		if email == "" {
			fmt.Println("Error: Email cannot be blank.")
			continue
		}
		if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
			fmt.Println("Error: Enter a valid email address.")
			continue
		}
		break
	}

	// --- Username (optional) ---
	fmt.Print("Username (leave blank to use email): ")
	usernameInput, _ := reader.ReadString('\n')
	username := strings.TrimSpace(usernameInput)
	if username == "" {
		username = email
	}

	// --- Password ---
	var password string
	for {
		fmt.Print("Password: ")
		pw1, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println()
		if err != nil {
			log.Fatalf("Failed to read password: %v", err)
		}

		fmt.Print("Password (again): ")
		pw2, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println()
		if err != nil {
			log.Fatalf("Failed to read password: %v", err)
		}

		if string(pw1) != string(pw2) {
			fmt.Println("Error: Your passwords didn't match.")
			continue
		}

		password = string(pw1)

		if len(password) < 8 {
			fmt.Println("Error: Password must be at least 8 characters.")
			continue
		}

		// Validate complexity
		hasUpper, hasLower, hasNumber, hasSpecial := false, false, false, false
		for _, ch := range password {
			switch {
			case 'a' <= ch && ch <= 'z':
				hasLower = true
			case 'A' <= ch && ch <= 'Z':
				hasUpper = true
			case '0' <= ch && ch <= '9':
				hasNumber = true
			default:
				hasSpecial = true
			}
		}
		if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
			fmt.Println("Error: Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.")
			continue
		}

		break
	}

	// --- Create User ---
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user := &domain.User{
		Email:    encryption.DeterministicEncryptedString(email),
		Password: hashedPassword,
		Role:     domain.RoleEcopowerAdmin,
	}

	if username != email {
		un := encryption.DeterministicEncryptedString(username)
		user.Username = &un
	}

	// Check if user already exists
	var existing domain.User
	if err := db.Where("email = ?", user.Email).First(&existing).Error; err == nil {
		fmt.Println()
		fmt.Print("That email is already taken. Update the existing account's password? (y/N): ")
		confirm, _ := reader.ReadString('\n')
		confirm = strings.TrimSpace(strings.ToLower(confirm))
		if confirm == "y" || confirm == "yes" {
			db.Model(&existing).Update("password", hashedPassword)
			fmt.Println("Superuser password updated successfully.")
		} else {
			fmt.Println("Operation cancelled.")
			os.Exit(0)
		}
	} else {
		if err := db.Create(user).Error; err != nil {
			log.Fatalf("Failed to create superuser: %v", err)
		}
		fmt.Println()
		fmt.Println("Superuser created successfully.")
	}
}
