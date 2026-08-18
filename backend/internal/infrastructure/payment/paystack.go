package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
)

type paystackGateway struct {
	secretKey string
	baseURL   string
	client    *http.Client
}

// NewPaystackGateway creates a new instance of the Paystack payment gateway.
func NewPaystackGateway(secretKey string) domain.PaymentGateway {
	return &paystackGateway{
		secretKey: secretKey,
		baseURL:   "https://api.paystack.co",
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (p *paystackGateway) InitializePayment(ctx context.Context, req domain.PaymentRequest) (*domain.PaymentResponse, error) {
	endpoint := fmt.Sprintf("%s/transaction/initialize", p.baseURL)

	// Paystack expects amount in pesewas/kobo (i.e. multiplied by 100)
	payload := map[string]interface{}{
		"email":        req.Email,
		"amount":       int64(req.Amount * 100),
		"reference":    req.Reference,
		"callback_url": req.CallbackURL,
	}

	if len(req.Metadata) > 0 {
		payload["metadata"] = req.Metadata
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal paystack request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.secretKey))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			AuthorizationURL string `json:"authorization_url"`
			AccessCode       string `json:"access_code"`
			Reference        string `json:"reference"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Status {
		return nil, fmt.Errorf("paystack initialization failed: %s", result.Message)
	}

	return &domain.PaymentResponse{
		AuthorizationURL: result.Data.AuthorizationURL,
		AccessCode:       result.Data.AccessCode,
		Reference:        result.Data.Reference,
	}, nil
}

func (p *paystackGateway) VerifyPayment(ctx context.Context, reference string) (*domain.PaymentVerificationResult, error) {
	endpoint := fmt.Sprintf("%s/transaction/verify/%s", p.baseURL, reference)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.secretKey))

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Status    string  `json:"status"`
			Reference string  `json:"reference"`
			Amount    float64 `json:"amount"` // Note: This is in the smallest currency unit
			Currency  string  `json:"currency"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Status {
		return nil, fmt.Errorf("paystack verification failed: %s", result.Message)
	}

	status := domain.PaymentStatusPending
	if result.Data.Status == "success" {
		status = domain.PaymentStatusPaid
	}

	return &domain.PaymentVerificationResult{
		Status:    status,
		Amount:    result.Data.Amount / 100, // Convert back from pesewas/kobo
		Currency:  result.Data.Currency,
		Reference: result.Data.Reference,
	}, nil
}
