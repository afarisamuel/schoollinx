package mailer

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strconv"

	"github.com/user/high-school-management/backend/config"
	"gopkg.in/gomail.v2"
)

// MailService abstracts external SMTP connectivity
type MailService interface {
	SendBulkHTML(ctx context.Context, subject, htmlBody string, recipients []string) error
}

type smtpService struct {
	host     string
	username string
	password string
	from     string
	port     int
}

// NewSMTPService configures connection variables derived from application config
func NewSMTPService(cfg *config.Config) MailService {
	port, _ := strconv.Atoi(cfg.SMTPPort)
	if port == 0 {
		port = 587 // Default to standard TLS port
	}

	from := cfg.SMTPFrom
	if from == "" {
		from = "noreply@schoollinx.com"
	}

	return &smtpService{
		host:     cfg.SMTPHost,
		port:     port,
		username: cfg.SMTPUser,
		password: cfg.SMTPPass,
		from:     from,
	}
}

// SendBulkHTML constructs a message footprint and rapidly dispatches it over TCP connection.
// To avoid overwhelming the SMTP provider or hitting rate-limits, this leverages the fast gomail API.
func (s *smtpService) SendBulkHTML(ctx context.Context, subject, htmlBody string, recipients []string) error {
	// If credentials are completely missing, trigger a pseudo "Log Only" driver
	// This is highly useful for local QA engineering without an active Mailtrap account.
	if s.host == "" {
		log.Printf("\n--- [MOCK SMTP] OUTGOING EMAIL ---\nTo: %v\nSubject: %s\nBody: %s\n----------------------------------\n", recipients, subject, htmlBody)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", s.from)
	m.SetHeader("Subject", subject)

	// Add anti-spam headers for bulk/transactional emails
	m.SetHeader("Precedence", "bulk")
	m.SetHeader("Auto-Submitted", "auto-generated")

	// Generate a plain-text version by removing HTML tags
	// This satisfies spam filters looking for multi-part bodies that match the HTML content.
	re := regexp.MustCompile(`<[^>]*>`)
	plainText := re.ReplaceAllString(htmlBody, "")
	// Also replace common HTML entities if necessary, but this basic strip is usually enough for spam filters
	m.SetBody("text/plain", plainText)
	m.AddAlternative("text/html", htmlBody)

	d := gomail.NewDialer(s.host, s.port, s.username, s.password)

	// Open a single physical TCP connection to the SMTP server.
	sc, err := d.Dial()
	if err != nil {
		return fmt.Errorf("failed to open SMTP connection: %w", err)
	}
	defer sc.Close()

	// Iterate through targets, transmitting the specific payload over the active socket
	for _, recipient := range recipients {
		m.SetHeader("To", recipient)

		if err := gomail.Send(sc, m); err != nil {
			log.Printf("[SMTP ERROR] Failed dropping mail to %s: %v", recipient, err)
			continue // Do not fail the entire batch if one email bounces locally
		}
	}

	return nil
}
