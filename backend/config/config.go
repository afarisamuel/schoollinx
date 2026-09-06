package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL          string
	Port                 string
	JWTSecret            string
	EncryptionKey        string
	SMTPHost             string
	SMTPPort             string
	SMTPUser             string
	SMTPPass             string
	SMTPFrom             string
	PaystackSecretKey    string
	SMSAPIKey            string
	WhatsAppAPIKey       string // ARKASEL_WHATSAPP_API_KEY
	WhatsAppSenderNumber string // ARKASEL_WHATSAPP_SENDER  (WhatsApp Business phone number ID)
	AutoMigrate          bool
	RedisURL             string
	VAPIDPublicKey       string
	VAPIDPrivateKey      string
	VAPIDSubject         string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379" // Default to local redis
	}

	vapidPublic := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@schoollinx.com"
	}

	return &Config{
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		Port:                 os.Getenv("PORT"),
		JWTSecret:            os.Getenv("JWT_SECRET"),
		EncryptionKey:        os.Getenv("ENCRYPTION_KEY"),
		SMTPHost:             os.Getenv("SMTP_HOST"),
		SMTPPort:             os.Getenv("SMTP_PORT"),
		SMTPUser:             os.Getenv("SMTP_USER"),
		SMTPPass:             os.Getenv("SMTP_PASS"),
		SMTPFrom:             os.Getenv("SMTP_FROM"),
		AutoMigrate:          os.Getenv("AUTO_MIGRATE") == "true",
		PaystackSecretKey:    os.Getenv("PAYSTACK_SECRET_KEY"),
		SMSAPIKey:            os.Getenv("ARKASEL_SMS_API_KEY"),
		WhatsAppAPIKey:       os.Getenv("ARKASEL_WHATSAPP_API_KEY"),
		WhatsAppSenderNumber: os.Getenv("ARKASEL_WHATSAPP_SENDER"),
		RedisURL:             redisURL,
		VAPIDPublicKey:       vapidPublic,
		VAPIDPrivateKey:      vapidPrivate,
		VAPIDSubject:         vapidSubject,
	}
}

func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.EncryptionKey == "" {
		return fmt.Errorf("ENCRYPTION_KEY is required")
	}
	return nil
}
