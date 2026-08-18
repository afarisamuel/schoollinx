package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

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
	if p.apiKey == "" {
		return fmt.Errorf("arkasel api key is not configured")
	}

	payload := arkaselPayload{
		Sender:     senderID,
		Message:    message,
		Recipients: recipients,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal sms payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://sms.arkasel.com/api/v2/sms/send", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("api-key", p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("arkasel api request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("arkasel returned error status: %d", resp.StatusCode)
	}

	return nil
}
