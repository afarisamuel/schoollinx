package main

import (
	"log"
	"net/smtp"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	if smtpHost == "" || smtpPort == "" {
		log.Fatal("SMTP_HOST and SMTP_PORT must be set")
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	to := []string{"test@example.com"}
	msg := []byte("To: test@example.com\r\n" +
		"Subject: BasicSMS SMTP Verification\r\n" +
		"\r\n" +
		"This is a test email to verify SMTP configuration for the newsletter worker.\r\n")

	addr := smtpHost + ":" + smtpPort
	log.Printf("Connecting to SMTP server at %s...", addr)

	err := smtp.SendMail(addr, auth, smtpUser, to, msg)
	if err != nil {
		log.Fatalf("Failed to send test email: %v", err)
	}

	log.Println("Successfully sent test email!")
}
