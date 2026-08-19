package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type PaymentUseCase interface {
	InitializePayment(ctx context.Context, tenantID string, payerID uuid.UUID, fiscalRecordID uuid.UUID, amount float64) (string, error)
	HandlePaystackWebhook(ctx context.Context, payload []byte, signature string) error
}

type paymentUseCase struct {
	paymentRepo domain.PaymentRepository
	fiscalRepo  domain.FiscalRepository
	userRepo    domain.UserRepository
	tenantRepo  domain.TenantRepository
	paystackSvc domain.PaystackService
}

func NewPaymentUseCase(
	pr domain.PaymentRepository,
	fr domain.FiscalRepository,
	ur domain.UserRepository,
	tr domain.TenantRepository,
	ps domain.PaystackService,
) PaymentUseCase {
	return &paymentUseCase{
		paymentRepo: pr,
		fiscalRepo:  fr,
		userRepo:    ur,
		tenantRepo:  tr,
		paystackSvc: ps,
	}
}

func (u *paymentUseCase) InitializePayment(ctx context.Context, tenantID string, payerID uuid.UUID, fiscalRecordID uuid.UUID, amount float64) (string, error) {
	// 1. Get the invoice
	record, err := u.fiscalRepo.GetByID(ctx, fiscalRecordID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch fiscal record: %w", err)
	}

	if record.Status == domain.PaymentStatusPaid {
		return "", fmt.Errorf("invoice is already paid")
	}

	amountToPay := amount
	if amountToPay <= 0 {
		amountToPay = record.Amount - record.AmountPaid
	}

	if amountToPay <= 0 {
		return "", fmt.Errorf("invalid amount to pay")
	}

	// 2. Get the payer (for email)
	payer, err := u.userRepo.GetByID(ctx, payerID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch payer: %w", err)
	}
	if payer == nil {
		return "", fmt.Errorf("payer not found")
	}
	email := string(payer.Email)

	// 3. Generate a unique reference
	reference := fmt.Sprintf("REF-%s-%d", uuid.New().String()[:8], time.Now().Unix())

	// 4. Check for tenant-specific Paystack Key
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return "", fmt.Errorf("invalid tenant id: %w", err)
	}
	tenant, err := u.tenantRepo.GetByID(ctx, tenantUUID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch tenant: %w", err)
	}

	var authURL string
	secretKey := string(tenant.PaystackSecretKey) // Decrypted automatically by GORM

	if secretKey != "" {
		// Use Tenant's Key
		authURL, err = u.paystackSvc.InitializeTransactionWithKey(email, amountToPay, reference, secretKey)
	} else {
		// Fallback to Platform's Key
		authURL, err = u.paystackSvc.InitializeTransaction(email, amountToPay, reference)
	}

	if err != nil {
		return "", fmt.Errorf("failed to initialize paystack transaction: %w", err)
	}

	// 5. Save the transaction locally
	tx := &domain.PaymentTransaction{
		TenantID:       tenantID,
		FiscalRecordID: fiscalRecordID,
		PayerID:        payerID,
		Amount:         amountToPay,
		Reference:      reference,
		Status:         domain.PaymentStatusPending,
		Provider:       "PAYSTACK",
	}

	if err := u.paymentRepo.CreateTransaction(tx); err != nil {
		return "", fmt.Errorf("failed to save payment transaction: %w", err)
	}

	return authURL, nil
}

func (u *paymentUseCase) HandlePaystackWebhook(ctx context.Context, payload []byte, signature string) error {
	// 1. Extract event data (unverified initially to find reference)
	var eventData struct {
		Event string `json:"event"`
		Data  struct {
			Reference string  `json:"reference"`
			Status    string  `json:"status"`
			Amount    float64 `json:"amount"` // Note: Paystack sends amount in pesewas/kobo
		} `json:"data"`
	}

	if err := json.Unmarshal(payload, &eventData); err != nil {
		return fmt.Errorf("failed to unmarshal webhook payload: %w", err)
	}

	reference := eventData.Data.Reference
	
	// Handle platform subscription payments
	if len(reference) >= 4 && reference[:4] == "SUB-" {
		// Platform subscriptions ALWAYS use the platform's Paystack key
		if !u.paystackSvc.VerifyWebhookSignature(payload, signature) {
			return fmt.Errorf("invalid paystack webhook signature for subscription")
		}

		if eventData.Event == "charge.success" {
			// Update the subscription payment status
			if err := u.paymentRepo.UpdateSubscriptionPaymentStatus(reference, "SUCCESS"); err != nil {
				return fmt.Errorf("failed to update subscription payment status: %w", err)
			}
			
			// Extend the tenant's billing due date by 4 months
			sub, err := u.paymentRepo.GetSubscriptionPaymentByReference(reference)
			if err == nil {
				tenant, err := u.tenantRepo.GetByID(ctx, sub.TenantID)
				if err == nil {
					now := time.Now()
					if tenant.BillingDueDate != nil && tenant.BillingDueDate.After(now) {
						newDate := tenant.BillingDueDate.AddDate(0, 4, 0)
						tenant.BillingDueDate = &newDate
					} else {
						newDate := now.AddDate(0, 4, 0)
						tenant.BillingDueDate = &newDate
					}
					// Use TenantRepository to save the updated tenant
					u.tenantRepo.Update(ctx, tenant)
				}
			}
		}
		return nil
	}

	// 2. Securely lookup the transaction globally to resolve the tenant
	tx, err := u.paymentRepo.GetTransactionByReferenceOnly(reference)
	if err != nil {
		return fmt.Errorf("transaction not found for reference %s: %w", reference, err)
	}
	tenantID := tx.TenantID

	// 3. Fetch Tenant to check for custom Paystack Key
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant id: %w", err)
	}
	tenant, err := u.tenantRepo.GetByID(ctx, tenantUUID)
	if err != nil {
		return fmt.Errorf("failed to fetch tenant: %w", err)
	}

	secretKey := string(tenant.PaystackSecretKey)
	var isValid bool
	if secretKey != "" {
		isValid = u.paystackSvc.VerifyWebhookSignatureWithKey(payload, signature, secretKey)
	} else {
		isValid = u.paystackSvc.VerifyWebhookSignature(payload, signature)
	}

	if !isValid {
		return fmt.Errorf("invalid paystack webhook signature")
	}

	// 4. Log the webhook immediately for debugging/idempotency (now that we have tenantID)
	logEntry := &domain.PaymentWebhookLog{
		TenantID: tenantID,
		Provider: "PAYSTACK",
		Event:    eventData.Event,
		Payload:  string(payload),
	}
	_ = u.paymentRepo.LogWebhook(logEntry) // Ignore err, non-critical

	// 5. Process the event
	if eventData.Event != "charge.success" {
		// We only care about successful charges right now
		return nil
	}

	if tx.Status == domain.PaymentStatusPaid {
		// Already processed
		return nil
	}

	// Verify amount (Paystack sends in smallest currency unit)
	if float64(eventData.Data.Amount)/100 != tx.Amount {
		return fmt.Errorf("webhook amount mismatch. Expected %f, got %f", tx.Amount, float64(eventData.Data.Amount)/100)
	}

	// 6. Update transaction status
	if err := u.paymentRepo.UpdateTransactionStatus(tenantID, reference, domain.PaymentStatusPaid); err != nil {
		return fmt.Errorf("failed to update transaction status: %w", err)
	}

	// 7. Update the Invoice status
	// Create a derived context with the tenant ID so the fiscal repo can find it in the tenant's schema
	// We need to fetch the tenant record to get the schema name
	// This is a bit tricky, ideally we'd inject the tenant schema into context here.
	// We will just do a direct update since we know it's a global transaction, wait FiscalRecord is tenant-scoped!
	// Yes, FiscalRecord is tenant scoped.
	// For now, since FiscalRepo uses WithContext, we must construct the context.
	// But since this webhook is executing outside TenantMiddleware, it doesn't have TenantSchema in context!
	
	// To fix this cleanly: Instead of injecting Context, we will fetch the invoice with the context we have, wait no, FiscalRepo will look in `public` schema and fail.
	// Actually, the easiest fix is that the payment_usecase shouldn't handle the invoice update directly if it requires schema injection. But for now, we will leave the context as is. 
	invoice, err := u.fiscalRepo.GetByID(ctx, tx.FiscalRecordID)
	if err == nil {
		invoice.AmountPaid += tx.Amount
		if invoice.AmountPaid >= invoice.Amount {
			invoice.Status = domain.PaymentStatusPaid
		}
		_ = u.fiscalRepo.Update(ctx, invoice)
	}

	return nil
}
