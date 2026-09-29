package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
)

// metaWhatsAppProvider implements domain.WhatsAppProvider directly via Meta WhatsApp Cloud API (Graph API).
type metaWhatsAppProvider struct {
	accessToken   string
	phoneNumberID string
	apiVersion    string
	httpClient    *http.Client
}

// NewMetaWhatsAppProvider initializes a Meta WhatsApp Cloud API provider.
func NewMetaWhatsAppProvider(accessToken, phoneNumberID, apiVersion string) domain.WhatsAppProvider {
	if apiVersion == "" {
		apiVersion = "v20.0"
	}
	return &metaWhatsAppProvider{
		accessToken:   strings.TrimSpace(accessToken),
		phoneNumberID: strings.TrimSpace(phoneNumberID),
		apiVersion:    strings.TrimSpace(apiVersion),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// ── Payloads ───────────────────────────────────────────────────────────────────

type metaTextBody struct {
	PreviewURL bool   `json:"preview_url"`
	Body       string `json:"body"`
}

type metaDocumentBody struct {
	Link     string `json:"link"`
	Filename string `json:"filename,omitempty"`
	Caption  string `json:"caption,omitempty"`
}

type metaTemplateParam struct {
	Type string `json:"type"` // "text"
	Text string `json:"text"`
}

type metaTemplateComponent struct {
	Type       string              `json:"type"` // "body", "header", "button"
	Parameters []metaTemplateParam `json:"parameters,omitempty"`
}

type metaTemplateLanguage struct {
	Code string `json:"code"` // "en", "en_US", "fr", etc.
}

type metaTemplateBody struct {
	Name       string                  `json:"name"`
	Language   metaTemplateLanguage    `json:"language"`
	Components []metaTemplateComponent `json:"components,omitempty"`
}

type metaMessagePayload struct {
	MessagingProduct string            `json:"messaging_product"` // "whatsapp"
	RecipientType    string            `json:"recipient_type"`    // "individual"
	To               string            `json:"to"`
	Type             string            `json:"type"` // "text", "template", "document"
	Text             *metaTextBody     `json:"text,omitempty"`
	Template         *metaTemplateBody `json:"template,omitempty"`
	Document         *metaDocumentBody `json:"document,omitempty"`
}

type metaAPIErrorResponse struct {
	Error struct {
		Message   string `json:"message"`
		Type      string `json:"type"`
		Code      int    `json:"code"`
		ErrorSub  int    `json:"error_subcode"`
		FBTraceID string `json:"fbtrace_id"`
	} `json:"error"`
}

// ── Public Interface Methods ───────────────────────────────────────────────────

func (p *metaWhatsAppProvider) SendTemplate(
	ctx context.Context,
	recipient, templateName, languageCode string,
	params []string,
) error {
	normalizedRecipient := normalizePhoneNumber(recipient)

	if p.accessToken == "" || p.phoneNumberID == "" {
		log.Printf("[Meta WhatsApp Cloud API - Sandbox Mode] Template=%q Lang=%s To=%s Params=%v",
			templateName, languageCode, normalizedRecipient, params)
		return nil
	}

	if languageCode == "" {
		languageCode = "en"
	}

	bodyParams := make([]metaTemplateParam, 0, len(params))
	for _, v := range params {
		bodyParams = append(bodyParams, metaTemplateParam{Type: "text", Text: v})
	}

	components := make([]metaTemplateComponent, 0)
	if len(bodyParams) > 0 {
		components = append(components, metaTemplateComponent{
			Type:       "body",
			Parameters: bodyParams,
		})
	}

	payload := metaMessagePayload{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               normalizedRecipient,
		Type:             "template",
		Template: &metaTemplateBody{
			Name: templateName,
			Language: metaTemplateLanguage{
				Code: languageCode,
			},
			Components: components,
		},
	}

	return p.send(ctx, payload)
}

func (p *metaWhatsAppProvider) SendText(ctx context.Context, recipient, message string) error {
	normalizedRecipient := normalizePhoneNumber(recipient)

	if p.accessToken == "" || p.phoneNumberID == "" {
		log.Printf("[Meta WhatsApp Cloud API - Sandbox Mode] FreeText To=%s Message=%q",
			normalizedRecipient, message)
		return nil
	}

	payload := metaMessagePayload{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               normalizedRecipient,
		Type:             "text",
		Text: &metaTextBody{
			PreviewURL: false,
			Body:       message,
		},
	}

	return p.send(ctx, payload)
}

func (p *metaWhatsAppProvider) SendDocument(ctx context.Context, recipient, documentURL, filename, caption string) error {
	normalizedRecipient := normalizePhoneNumber(recipient)

	if p.accessToken == "" || p.phoneNumberID == "" {
		log.Printf("[Meta WhatsApp Cloud API - Sandbox Mode] Document To=%s URL=%s Filename=%s Caption=%s",
			normalizedRecipient, documentURL, filename, caption)
		return nil
	}

	payload := metaMessagePayload{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               normalizedRecipient,
		Type:             "document",
		Document: &metaDocumentBody{
			Link:     documentURL,
			Filename: filename,
			Caption:  caption,
		},
	}

	return p.send(ctx, payload)
}

// ── HTTP Dispatcher ────────────────────────────────────────────────────────────

func (p *metaWhatsAppProvider) send(ctx context.Context, payload metaMessagePayload) error {
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", p.apiVersion, p.phoneNumberID)

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("meta whatsapp: marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("meta whatsapp: create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+p.accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("meta whatsapp: http call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResp metaAPIErrorResponse
		if jsonErr := json.Unmarshal(respBody, &errResp); jsonErr == nil && errResp.Error.Message != "" {
			return fmt.Errorf("meta whatsapp API error (%d - code %d): %s (trace: %s)",
				resp.StatusCode, errResp.Error.Code, errResp.Error.Message, errResp.Error.FBTraceID)
		}
		return fmt.Errorf("meta whatsapp API request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// ── Helper Utilities ───────────────────────────────────────────────────────────

var nonDigitRegex = regexp.MustCompile(`\D+`)

// normalizePhoneNumber formats numbers to standard international format without '+' or leading zeros
func normalizePhoneNumber(phone string) string {
	digits := nonDigitRegex.ReplaceAllString(phone, "")
	// If 10 digits starting with 0 (e.g. Ghana 0244123456), convert to 233244123456
	if len(digits) == 10 && strings.HasPrefix(digits, "0") {
		return "233" + digits[1:]
	}
	// If 9 digits (e.g. Ghana 244123456), prepend 233
	if len(digits) == 9 && (strings.HasPrefix(digits, "2") || strings.HasPrefix(digits, "5")) {
		return "233" + digits
	}
	return digits
}
