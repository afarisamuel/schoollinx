package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/user/high-school-management/backend/internal/domain"
)

const arkaselWhatsAppBaseURL = "https://api.arkesel.com/v1/whatsapp"

// arkaselWhatsAppProvider implements domain.WhatsAppProvider via the Arkesel
// WhatsApp Business API (backed by Meta Cloud API).
type arkaselWhatsAppProvider struct {
	apiKey string
	sender string // Your WhatsApp Business phone number ID registered with Arkesel
}

// NewArkaselWhatsAppProvider returns a WhatsAppProvider backed by Arkesel.
// apiKey is the Arkesel API key; sender is the WhatsApp Business phone number ID.
func NewArkaselWhatsAppProvider(apiKey, sender string) domain.WhatsAppProvider {
	return &arkaselWhatsAppProvider{apiKey: apiKey, sender: sender}
}

// ── Template message ────────────────────────────────────────────────────────

type whatsAppTemplateParam struct {
	Type string `json:"type"` // "text"
	Text string `json:"text"`
}

type whatsAppTemplateComponent struct {
	Type       string                  `json:"type"` // "body"
	Parameters []whatsAppTemplateParam `json:"parameters,omitempty"`
}

type whatsAppTemplatePayload struct {
	Sender       string                      `json:"sender"`
	Recipient    string                      `json:"recipient"`
	TemplateName string                      `json:"template_name"`
	LanguageCode string                      `json:"language_code"`
	Components   []whatsAppTemplateComponent `json:"components,omitempty"`
}

func (p *arkaselWhatsAppProvider) SendTemplate(
	ctx context.Context,
	recipient, templateName, languageCode string,
	params []string,
) error {
	if p.apiKey == "" {
		// Sandbox mode – log instead of failing
		fmt.Printf("[Arkasel WhatsApp - Sandbox] Template=%q Lang=%s To=%s Params=%v\n",
			templateName, languageCode, recipient, params)
		return nil
	}

	bodyParams := make([]whatsAppTemplateParam, 0, len(params))
	for _, v := range params {
		bodyParams = append(bodyParams, whatsAppTemplateParam{Type: "text", Text: v})
	}

	payload := whatsAppTemplatePayload{
		Sender:       p.sender,
		Recipient:    recipient,
		TemplateName: templateName,
		LanguageCode: languageCode,
	}
	if len(bodyParams) > 0 {
		payload.Components = []whatsAppTemplateComponent{
			{Type: "body", Parameters: bodyParams},
		}
	}

	return p.post(ctx, arkaselWhatsAppBaseURL+"/send/template", payload)
}

// ── Free-text reply (24-hour session window) ────────────────────────────────

type whatsAppTextPayload struct {
	Sender    string `json:"sender"`
	Recipient string `json:"recipient"`
	Message   string `json:"message"`
}

func (p *arkaselWhatsAppProvider) SendText(ctx context.Context, recipient, message string) error {
	if p.apiKey == "" {
		// Sandbox mode – log instead of failing
		fmt.Printf("[Arkasel WhatsApp - Sandbox] FreeText To=%s Message=%q\n", recipient, message)
		return nil
	}

	payload := whatsAppTextPayload{
		Sender:    p.sender,
		Recipient: recipient,
		Message:   message,
	}

	return p.post(ctx, arkaselWhatsAppBaseURL+"/send/text", payload)
}

// ── HTTP helper ─────────────────────────────────────────────────────────────

func (p *arkaselWhatsAppProvider) post(ctx context.Context, url string, body interface{}) error {
	jsonData, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("arkasel whatsapp: marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("arkasel whatsapp: create request: %w", err)
	}
	req.Header.Set("api-key", p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return fmt.Errorf("arkasel whatsapp: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("arkasel whatsapp: server returned %d for %s", resp.StatusCode, url)
	}
	return nil
}
