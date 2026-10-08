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
	SMSAPIKey                  string
	WhatsAppProvider           string // "meta" or "arkesel"
	WhatsAppAccessToken        string // META_WHATSAPP_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN
	WhatsAppPhoneNumberID      string // META_WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_PHONE_NUMBER_ID
	WhatsAppBusinessAccountID  string // META_WHATSAPP_WABA_ID or WHATSAPP_BUSINESS_ACCOUNT_ID
	WhatsAppWebhookVerifyToken string // META_WHATSAPP_WEBHOOK_VERIFY_TOKEN or WHATSAPP_WEBHOOK_VERIFY_TOKEN
	WhatsAppAPIVersion         string // META_WHATSAPP_API_VERSION (default: "v20.0")
	WhatsAppAPIKey             string // Legacy/Fallback ARKASEL_WHATSAPP_API_KEY
	WhatsAppSenderNumber       string // Legacy/Fallback ARKASEL_WHATSAPP_SENDER
	AutoMigrate                bool
	RedisURL                   string
	VAPIDPublicKey             string
	VAPIDPrivateKey            string
	VAPIDSubject               string
	FCMCredentialsFile         string
	FCMCredentialsJSON         string
	PushWorkerIntervalSec      int
	PushWorkerRateLimit        int
	GeminiAPIKey               string
	OpenAIAPIKey               string
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
	if vapidPublic == "" {
		vapidPublic = "BAbf0lMDGYjVjUHlgfEeZzfIX_urfI9UBZL8GOp8DFNcIdcAwS4TDBbN5dCcH1ieao9buXc2_JR_h6V7XLQoiAQ"
	}
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	if vapidPrivate == "" {
		vapidPrivate = "fqlG88R1VK5b-xC3yUYn1lPFZJjN7aG1A-fbLup2cKA"
	}
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@schoollinx.com"
	}

	return &Config{
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		Port:              os.Getenv("PORT"),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		EncryptionKey:     os.Getenv("ENCRYPTION_KEY"),
		SMTPHost:          os.Getenv("SMTP_HOST"),
		SMTPPort:          os.Getenv("SMTP_PORT"),
		SMTPUser:          os.Getenv("SMTP_USER"),
		SMTPPass:          os.Getenv("SMTP_PASS"),
		SMTPFrom:          os.Getenv("SMTP_FROM"),
		AutoMigrate:       os.Getenv("AUTO_MIGRATE") == "true",
		PaystackSecretKey: os.Getenv("PAYSTACK_SECRET_KEY"),
		SMSAPIKey: func() string {
			if k := os.Getenv("ARKASEL_SMS_API_KEY"); k != "" {
				return k
			}
			if k := os.Getenv("ARKESEL_SMS_API_KEY"); k != "" {
				return k
			}
			if k := os.Getenv("ARKESEL_API_KEY"); k != "" {
				return k
			}
			return os.Getenv("SMS_API_KEY")
		}(),
		WhatsAppProvider: func() string {
			if p := os.Getenv("WHATSAPP_PROVIDER"); p != "" {
				return p
			}
			if os.Getenv("META_WHATSAPP_ACCESS_TOKEN") != "" || os.Getenv("WHATSAPP_ACCESS_TOKEN") != "" {
				return "meta"
			}
			return "meta"
		}(),
		WhatsAppAccessToken: func() string {
			if t := os.Getenv("META_WHATSAPP_ACCESS_TOKEN"); t != "" {
				return t
			}
			if t := os.Getenv("WHATSAPP_ACCESS_TOKEN"); t != "" {
				return t
			}
			return os.Getenv("WHATSAPP_TOKEN")
		}(),
		WhatsAppPhoneNumberID: func() string {
			if id := os.Getenv("META_WHATSAPP_PHONE_NUMBER_ID"); id != "" {
				return id
			}
			if id := os.Getenv("WHATSAPP_PHONE_NUMBER_ID"); id != "" {
				return id
			}
			return os.Getenv("ARKASEL_WHATSAPP_SENDER")
		}(),
		WhatsAppBusinessAccountID: func() string {
			if id := os.Getenv("META_WHATSAPP_WABA_ID"); id != "" {
				return id
			}
			return os.Getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
		}(),
		WhatsAppWebhookVerifyToken: func() string {
			if vt := os.Getenv("META_WHATSAPP_WEBHOOK_VERIFY_TOKEN"); vt != "" {
				return vt
			}
			if vt := os.Getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN"); vt != "" {
				return vt
			}
			return "schoollinx_whatsapp_verify_token_2026"
		}(),
		WhatsAppAPIVersion: func() string {
			if v := os.Getenv("META_WHATSAPP_API_VERSION"); v != "" {
				return v
			}
			return "v20.0"
		}(),
		WhatsAppAPIKey:       os.Getenv("ARKASEL_WHATSAPP_API_KEY"),
		WhatsAppSenderNumber: os.Getenv("ARKASEL_WHATSAPP_SENDER"),
		RedisURL:             redisURL,
		VAPIDPublicKey:       vapidPublic,
		VAPIDPrivateKey:      vapidPrivate,
		VAPIDSubject:         vapidSubject,
		FCMCredentialsFile:   os.Getenv("FIREBASE_CREDENTIALS_FILE"),
		FCMCredentialsJSON:   os.Getenv("FIREBASE_CREDENTIALS_JSON"),
		PushWorkerIntervalSec: func() int {
			if s := os.Getenv("PUSH_WORKER_INTERVAL_SEC"); s != "" {
				var v int
				if _, err := fmt.Sscanf(s, "%d", &v); err == nil && v > 0 {
					return v
				}
			}
			return 30
		}(),
		PushWorkerRateLimit: func() int {
			if s := os.Getenv("PUSH_WORKER_RATE_LIMIT"); s != "" {
				var v int
				if _, err := fmt.Sscanf(s, "%d", &v); err == nil && v > 0 {
					return v
				}
			}
			return 10
		}(),
		GeminiAPIKey: func() string {
			if k := os.Getenv("GEMINI_API_KEY"); k != "" {
				return k
			}
			if k := os.Getenv("GOOGLE_API_KEY"); k != "" {
				return k
			}
			return os.Getenv("AI_API_KEY")
		}(),
		OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),
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
	if (os.Getenv("ENV") == "production" || os.Getenv("GIN_MODE") == "release") &&
		c.VAPIDPublicKey == "BAbf0lMDGYjVjUHlgfEeZzfIX_urfI9UBZL8GOp8DFNcIdcAwS4TDBbN5dCcH1ieao9buXc2_JR_h6V7XLQoiAQ" {
		log.Println("WARNING: Default VAPID keys detected in production environment. Please generate dedicated VAPID keys for WebPush.")
	}
	return nil
}
