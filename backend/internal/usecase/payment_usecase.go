package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type PaymentUseCase interface {
	InitializePayment(ctx context.Context, tenantID string, payerID uuid.UUID, fiscalRecordID uuid.UUID, studentID uuid.UUID, payerEmail string, amount float64, callbackURL string) (string, error)
	InitializeWalletTopUp(ctx context.Context, tenantID string, studentID uuid.UUID, payerEmail string, amount float64, callbackURL string) (string, error)
	VerifyPayment(ctx context.Context, tenantID string, reference string) (*domain.PaymentTransaction, error)
	HandlePaystackWebhook(ctx context.Context, payload []byte, signature string) error
}

type paymentUseCase struct {
	paymentRepo domain.PaymentRepository
	fiscalRepo  domain.FiscalRepository
	userRepo    domain.UserRepository
	tenantRepo  domain.TenantRepository
	paystackSvc domain.PaystackService
	studentRepo domain.StudentRepository
}

func NewPaymentUseCase(
	pr domain.PaymentRepository,
	fr domain.FiscalRepository,
	ur domain.UserRepository,
	tr domain.TenantRepository,
	ps domain.PaystackService,
	sr ...domain.StudentRepository,
) PaymentUseCase {
	uc := &paymentUseCase{
		paymentRepo: pr,
		fiscalRepo:  fr,
		userRepo:    ur,
		tenantRepo:  tr,
		paystackSvc: ps,
	}
	if len(sr) > 0 {
		uc.studentRepo = sr[0]
	}
	return uc
}

func (u *paymentUseCase) InitializePayment(ctx context.Context, tenantID string, payerID uuid.UUID, fiscalRecordID uuid.UUID, studentID uuid.UUID, payerEmail string, amount float64, callbackURL string) (string, error) {
	// 1. Get the invoice / fiscal record
	var record *domain.FiscalRecord
	if fiscalRecordID != uuid.Nil {
		var err error
		record, err = u.fiscalRepo.GetByID(ctx, fiscalRecordID)
		if err != nil {
			return "", fmt.Errorf("failed to fetch fiscal record: %w", err)
		}
	} else if studentID != uuid.Nil {
		records, err := u.fiscalRepo.GetByStudent(ctx, studentID)
		if err != nil || len(records) == 0 {
			return "", fmt.Errorf("no pending invoice found for this student")
		}
		for i := range records {
			if records[i].Status != domain.PaymentStatusPaid && (records[i].Amount-records[i].AmountPaid) > 0 {
				record = &records[i]
				fiscalRecordID = record.ID
				break
			}
		}
		if record == nil {
			return "", fmt.Errorf("all invoices for this student are already settled")
		}
	} else {
		return "", fmt.Errorf("fiscal_record_id or student_id is required")
	}

	remainingBalance := record.Amount - record.AmountPaid
	if remainingBalance <= 0 {
		return "", fmt.Errorf("invoice is already fully paid")
	}

	amountToPay := remainingBalance
	if amount > 0 && amount <= remainingBalance {
		amountToPay = amount
	} else if amount > 0 {
		amountToPay = amount
	}

	if amountToPay <= 0 {
		return "", fmt.Errorf("payment amount must be greater than zero")
	}

	// 2. Fetch payer's email (graceful fallback)
	email := payerEmail
	if email == "" && payerID != uuid.Nil && u.userRepo != nil {
		payer, err := u.userRepo.GetByID(ctx, payerID)
		if err == nil && payer != nil && payer.Email != "" {
			email = string(payer.Email)
		}
	}
	if email == "" {
		email = "parent@schoollinx.com"
	}

	// 3. Generate a unique reference
	reference := fmt.Sprintf("REF-%s-%d", uuid.New().String()[:8], time.Now().Unix())

	// 4. Check for tenant-specific Paystack Key or Subaccount
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return "", fmt.Errorf("invalid tenant id: %w", err)
	}
	tenant, err := u.tenantRepo.GetByID(ctx, tenantUUID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch tenant: %w", err)
	}

	// Ensure callbackURL uses the tenant subdomain if not provided
	if callbackURL == "" && tenant.Subdomain != "" {
		callbackURL = fmt.Sprintf("https://%s.schoollinx.com/parents/finance", tenant.Subdomain)
	}

	var authURL string
	secretKey := string(tenant.PaystackSecretKey) // Decrypted automatically by GORM

	if secretKey != "" {
		// Use Tenant's Direct Key
		authURL, err = u.paystackSvc.InitializeTransactionWithKey(email, amountToPay, reference, secretKey, callbackURL)
	} else if tenant.PaystackSubaccountCode != "" {
		// Route fees directly into the school's Paystack Subaccount!
		authURL, err = u.paystackSvc.InitializeTransactionWithOptions(email, amountToPay, reference, "", tenant.PaystackSubaccountCode, callbackURL)
	} else {
		// Fallback to Platform's Key
		authURL, err = u.paystackSvc.InitializeTransactionWithOptions(email, amountToPay, reference, "", "", callbackURL)
	}

	if err != nil {
		return "", fmt.Errorf("failed to initialize paystack transaction: %w", err)
	}

	// 5. Save the transaction locally
	tx := &domain.PaymentTransaction{
		ID:             uuid.New(),
		TenantID:       tenantID,
		FiscalRecordID: &fiscalRecordID,
		StudentID:      &record.StudentID,
		Amount:         amountToPay,
		Reference:      reference,
		Status:         domain.PaymentStatusPending,
		Provider:       "PAYSTACK",
	}
	if payerID != uuid.Nil {
		tx.PayerID = &payerID
	}

	if err := u.paymentRepo.CreateTransaction(tx); err != nil {
		return "", fmt.Errorf("failed to save payment transaction: %w", err)
	}

	return authURL, nil
}

func (u *paymentUseCase) InitializeWalletTopUp(ctx context.Context, tenantID string, studentID uuid.UUID, payerEmail string, amount float64, callbackURL string) (string, error) {
	if amount <= 0 {
		return "", fmt.Errorf("top-up amount must be greater than zero")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return "", fmt.Errorf("invalid tenant id: %w", err)
	}
	tenant, err := u.tenantRepo.GetByID(ctx, tenantUUID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch tenant: %w", err)
	}

	if payerEmail == "" {
		payerEmail = "parent@schoollinx.com"
	}

	reference := fmt.Sprintf("TOPUP-%s-%d", studentID.String()[:8], time.Now().Unix())

	// Ensure callbackURL uses the tenant subdomain if not provided
	if callbackURL == "" && tenant.Subdomain != "" {
		callbackURL = fmt.Sprintf("https://%s.schoollinx.com/parents?tab=billing", tenant.Subdomain)
	}

	var authURL string
	secretKey := string(tenant.PaystackSecretKey)

	if secretKey != "" {
		authURL, err = u.paystackSvc.InitializeTransactionWithKey(payerEmail, amount, reference, secretKey, callbackURL)
	} else if tenant.PaystackSubaccountCode != "" {
		// Route wallet top-up directly into the school's Paystack Subaccount!
		authURL, err = u.paystackSvc.InitializeTransactionWithOptions(payerEmail, amount, reference, "", tenant.PaystackSubaccountCode, callbackURL)
	} else {
		authURL, err = u.paystackSvc.InitializeTransactionWithOptions(payerEmail, amount, reference, "", "", callbackURL)
	}

	if err != nil {
		return "", fmt.Errorf("failed to initialize paystack wallet top-up: %w", err)
	}

	tx := &domain.PaymentTransaction{
		ID:        uuid.New(),
		TenantID:  tenantID,
		StudentID: &studentID,
		Amount:    amount,
		Reference: reference,
		Status:    domain.PaymentStatusPending,
		Provider:  "PAYSTACK",
	}

	if err := u.paymentRepo.CreateTransaction(tx); err != nil {
		return "", fmt.Errorf("failed to save payment transaction: %w", err)
	}

	return authURL, nil
}

func (u *paymentUseCase) VerifyPayment(ctx context.Context, tenantID string, reference string) (*domain.PaymentTransaction, error) {
	tx, err := u.paymentRepo.GetTransactionByReferenceOnly(reference)
	if err != nil || tx == nil {
		return nil, fmt.Errorf("transaction not found")
	}

	tenantUUID, _ := uuid.Parse(tx.TenantID)
	tenant, err := u.tenantRepo.GetByID(ctx, tenantUUID)
	if err != nil || tenant == nil {
		return nil, fmt.Errorf("tenant not found")
	}

	// Inject tenant context so GORM targets the correct tenant schema
	tenantCtx := context.WithValue(ctx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	// Idempotent: If already marked paid, reconcile invoice if needed and return immediately
	if tx.Status == domain.PaymentStatusPaid {
		if tx.FiscalRecordID != nil && *tx.FiscalRecordID != uuid.Nil {
			invoice, err := u.fiscalRepo.GetByID(tenantCtx, *tx.FiscalRecordID)
			if err == nil && invoice != nil && invoice.AmountPaid < tx.Amount {
				invoice.AmountPaid += tx.Amount
				if invoice.AmountPaid >= invoice.Amount {
					invoice.Status = domain.PaymentStatusPaid
				}
				_ = u.fiscalRepo.Update(tenantCtx, invoice)
			}
		}
		return tx, nil
	}

	secretKey := string(tenant.PaystackSecretKey)
	var status string
	if secretKey != "" {
		status, err = u.paystackSvc.VerifyTransactionWithKey(reference, secretKey)
	} else {
		status, err = u.paystackSvc.VerifyTransaction(reference)
	}

	if err != nil {
		return nil, fmt.Errorf("paystack verification failed: %w", err)
	}

	if status != "success" {
		return tx, fmt.Errorf("payment status is: %s", status)
	}

	// 1. Mark transaction as PAID
	if err := u.paymentRepo.UpdateTransactionStatus(tx.TenantID, reference, domain.PaymentStatusPaid); err != nil {
		return nil, fmt.Errorf("failed to update transaction status: %w", err)
	}
	tx.Status = domain.PaymentStatusPaid

	// 2. If regular fee payment (has FiscalRecordID) -> Credit Invoice
	if tx.FiscalRecordID != nil && *tx.FiscalRecordID != uuid.Nil {
		invoice, err := u.fiscalRepo.GetByID(tenantCtx, *tx.FiscalRecordID)
		if err == nil && invoice != nil {
			invoice.AmountPaid += tx.Amount
			if invoice.AmountPaid >= invoice.Amount {
				invoice.Status = domain.PaymentStatusPaid
			}
			_ = u.fiscalRepo.Update(tenantCtx, invoice)
		}
		return tx, nil
	}

	// 3. Otherwise, if wallet top-up (reference starts with "TOPUP-" or StudentID without FiscalRecordID)
	if (len(reference) >= 6 && reference[:6] == "TOPUP-") || (tx.StudentID != nil && *tx.StudentID != uuid.Nil) {
		var targetStudentID uuid.UUID
		if tx.StudentID != nil && *tx.StudentID != uuid.Nil {
			targetStudentID = *tx.StudentID
		} else if tx.FiscalRecordID != nil && *tx.FiscalRecordID != uuid.Nil {
			targetStudentID = *tx.FiscalRecordID
		}

		if u.studentRepo != nil && targetStudentID != uuid.Nil {
			student, err := u.studentRepo.GetByID(tenantCtx, targetStudentID)
			if err == nil && student != nil {
				student.PrepaidBalance += tx.Amount
				_ = u.studentRepo.Update(tenantCtx, student)
				_ = u.fiscalRepo.CreateWalletTransaction(tenantCtx, &domain.WalletTransaction{
					StudentID:   student.ID,
					Type:        domain.WalletTransactionCredit,
					Amount:      tx.Amount,
					Balance:     student.PrepaidBalance,
					Description: fmt.Sprintf("Online Paystack Top-Up (%s)", reference),
				})
			}
		}
		return tx, nil
	}

	return tx, nil
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

	// Inject tenant context so GORM targets the correct tenant schema
	tenantCtx := context.WithValue(ctx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	// 7. If regular fee payment (has FiscalRecordID) -> Credit Invoice
	if tx.FiscalRecordID != nil && *tx.FiscalRecordID != uuid.Nil {
		invoice, err := u.fiscalRepo.GetByID(tenantCtx, *tx.FiscalRecordID)
		if err == nil && invoice != nil {
			invoice.AmountPaid += tx.Amount
			if invoice.AmountPaid >= invoice.Amount {
				invoice.Status = domain.PaymentStatusPaid
			}
			_ = u.fiscalRepo.Update(tenantCtx, invoice)
		}
		return nil
	}

	// 8. Otherwise, if wallet top-up (reference starts with "TOPUP-" or StudentID without FiscalRecordID)
	if (len(reference) >= 6 && reference[:6] == "TOPUP-") || (tx.StudentID != nil && *tx.StudentID != uuid.Nil) {
		var targetStudentID uuid.UUID
		if tx.StudentID != nil && *tx.StudentID != uuid.Nil {
			targetStudentID = *tx.StudentID
		} else if tx.FiscalRecordID != nil && *tx.FiscalRecordID != uuid.Nil {
			targetStudentID = *tx.FiscalRecordID
		}

		if u.studentRepo != nil && targetStudentID != uuid.Nil {
			student, err := u.studentRepo.GetByID(tenantCtx, targetStudentID)
			if err == nil && student != nil {
				student.PrepaidBalance += tx.Amount
				_ = u.studentRepo.Update(tenantCtx, student)
				_ = u.fiscalRepo.CreateWalletTransaction(tenantCtx, &domain.WalletTransaction{
					StudentID:   student.ID,
					Type:        domain.WalletTransactionCredit,
					Amount:      tx.Amount,
					Balance:     student.PrepaidBalance,
					Description: fmt.Sprintf("Online Paystack Top-Up (%s)", reference),
				})
			}
		}
		return nil
	}

	return nil
}
