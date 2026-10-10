package mailer

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

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

	var validRecipients []string
	for _, r := range recipients {
		r = strings.TrimSpace(r)
		if r != "" && strings.Contains(r, "@") {
			validRecipients = append(validRecipients, r)
		}
	}
	if len(validRecipients) == 0 {
		return nil
	}

	// Generate a plain-text version by removing HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	plainText := re.ReplaceAllString(htmlBody, "")

	d := gomail.NewDialer(s.host, s.port, s.username, s.password)
	d.TLSConfig = &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         s.host,
	}

	// Open physical TCP connection to the SMTP server
	sc, err := d.Dial()
	if err != nil {
		log.Printf("[SMTP DIAL ERROR] Failed to connect to SMTP %s:%d: %v", s.host, s.port, err)
		return fmt.Errorf("failed to open SMTP connection to %s:%d: %w", s.host, s.port, err)
	}
	defer sc.Close()

	for _, recipient := range validRecipients {
		m := gomail.NewMessage()
		m.SetHeader("From", s.from)
		m.SetHeader("Subject", subject)
		m.SetHeader("To", recipient)
		m.SetBody("text/html", htmlBody)
		m.AddAlternative("text/plain", plainText)

		if err := gomail.Send(sc, m); err != nil {
			log.Printf("[SMTP ERROR] Failed dropping mail to %s: %v", recipient, err)
			continue // Do not fail the entire batch if one email bounces locally
		}
		log.Printf("[SMTP SUCCESS] Email delivered to %s (Subject: %s)", recipient, subject)
	}

	return nil
}
