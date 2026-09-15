package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
)

type arkaselProvider struct {
	apiKey string
}

func NewArkaselSMSProvider(apiKey string) domain.SMSProvider {
	return &arkaselProvider{apiKey: apiKey}
}

type arkaselPayload struct {
	Recipients []string `json:"recipients"`
	Sender     string   `json:"sender"`
	Message    string   `json:"message"`
}

func (p *arkaselProvider) SendSMS(ctx context.Context, senderID string, recipients []string, message string) error {
	if senderID == "" {
		senderID = domain.DefaultSMSSenderID
	}

	// Normalize recipients
	var validRecipients []string
	for _, r := range recipients {
		r = strings.TrimSpace(r)
		r = strings.ReplaceAll(r, " ", "")
		r = strings.ReplaceAll(r, "-", "")
		r = strings.ReplaceAll(r, "(", "")
		r = strings.ReplaceAll(r, ")", "")
		r = strings.ReplaceAll(r, ".", "")

		if strings.HasPrefix(r, "+") {
			r = strings.TrimPrefix(r, "+")
		} else if strings.HasPrefix(r, "0") && len(r) == 10 {
			r = "233" + r[1:]
		} else if len(r) == 9 && !strings.HasPrefix(r, "0") && !strings.HasPrefix(r, "233") {
			r = "233" + r
		}
		if r != "" {
			validRecipients = append(validRecipients, r)
		}
	}

	if len(validRecipients) == 0 {
		return fmt.Errorf("no valid recipients provided")
	}

	if p.apiKey == "" {
		fmt.Printf("[Arkesel SMS Gateway - Sandbox Mode] Sender: %s | Recipients: %d %v | Message: %q\n", senderID, len(validRecipients), validRecipients, message)
		return nil
	}

	payload := arkaselPayload{
		Sender:     senderID,
		Message:    message,
		Recipients: validRecipients,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal sms payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://sms.arkesel.com/api/v2/sms/send", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("api-key", p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("arkesel api request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("arkesel returned error status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
