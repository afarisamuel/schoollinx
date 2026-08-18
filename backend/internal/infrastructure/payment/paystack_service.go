package payment

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
)

type paystackService struct {
	config *config.Config
}

func NewPaystackService(cfg *config.Config) domain.PaystackService {
	return &paystackService{config: cfg}
}

func (s *paystackService) InitializeTransaction(email string, amount float64, reference string) (string, error) {
	return s.InitializeTransactionWithKey(email, amount, reference, s.config.PaystackSecretKey)
}

func (s *paystackService) InitializeTransactionWithKey(email string, amount float64, reference string, secretKey string) (string, error) {
	url := "https://api.paystack.co/transaction/initialize"

	// Paystack expects amount in pesewas/kobo
	payload := map[string]interface{}{
		"email":     email,
		"amount":    int(amount * 100),
		"reference": reference,
		"currency":  "GHS",
		// "callback_url": "https://frontend-url/payment/callback", // Can set this in Paystack dashboard
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", secretKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("paystack returned status: %d", resp.StatusCode)
	}

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
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Status {
		return "", fmt.Errorf("paystack initialization failed: %s", result.Message)
	}

	return result.Data.AuthorizationURL, nil
}

func (s *paystackService) VerifyWebhookSignature(payload []byte, signature string) bool {
	return s.VerifyWebhookSignatureWithKey(payload, signature, s.config.PaystackSecretKey)
}

func (s *paystackService) VerifyWebhookSignatureWithKey(payload []byte, signature string, secretKey string) bool {
	mac := hmac.New(sha512.New, []byte(secretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

func (s *paystackService) CreateSubaccount(businessName, settlementBank, accountNumber string, percentageCharge float64) (string, error) {
	url := "https://api.paystack.co/subaccount"

	payload := map[string]interface{}{
		"business_name":     businessName,
		"settlement_bank":   settlementBank,
		"account_number":    accountNumber,
		"percentage_charge": percentageCharge,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.config.PaystackSecretKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("paystack returned status: %d", resp.StatusCode)
	}

	var result struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			SubaccountCode string `json:"subaccount_code"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Status {
		return "", fmt.Errorf("paystack subaccount creation failed: %s", result.Message)
	}

	return result.Data.SubaccountCode, nil
}
