package domain

import (
	"context"
)

// PaymentProvider defines the supported payment gateways.
type PaymentProvider string

const (
	PaymentProviderPaystack PaymentProvider = "PAYSTACK"
	PaymentProviderManual   PaymentProvider = "MANUAL"
)

// PaymentRequest contains details needed to initialize a payment session.
type PaymentRequest struct {
	Amount      float64
	Currency    string // e.g. "GHS", "USD"
	Email       string
	Reference   string
	CallbackURL string
	Metadata    map[string]interface{}
}

// PaymentResponse contains the result of a payment initialization.
type PaymentResponse struct {
	AuthorizationURL string
	AccessCode       string
	Reference        string
}

// PaymentVerificationResult contains the result of a payment verification.
type PaymentVerificationResult struct {
	Status    PaymentStatus // e.g. PAID, PENDING, FAILED
	Amount    float64
	Currency  string
	Reference string
}

// PaymentGateway defines the interface for interacting with a payment provider.
type PaymentGateway interface {
	// InitializePayment starts a new payment session and returns the authorization URL.
	InitializePayment(ctx context.Context, req PaymentRequest) (*PaymentResponse, error)

	// VerifyPayment checks the status of a payment using its reference.
	VerifyPayment(ctx context.Context, reference string) (*PaymentVerificationResult, error)
}
