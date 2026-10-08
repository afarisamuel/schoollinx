package usecase_test

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

// MockPaymentRepo for USSD unit testing
type mockUSSDPaymentRepo struct {
	transactions []*domain.PaymentTransaction
}

func (m *mockUSSDPaymentRepo) CreateTransaction(tx *domain.PaymentTransaction) error {
	m.transactions = append(m.transactions, tx)
	return nil
}

func (m *mockUSSDPaymentRepo) GetTransactionByReference(tenantID, reference string) (*domain.PaymentTransaction, error) {
	return nil, nil
}

func (m *mockUSSDPaymentRepo) GetTransactionByReferenceOnly(reference string) (*domain.PaymentTransaction, error) {
	return nil, nil
}

func (m *mockUSSDPaymentRepo) UpdateTransactionStatus(tenantID, reference string, status domain.PaymentStatus) error {
	return nil
}

func (m *mockUSSDPaymentRepo) GetSubscriptionPaymentByReference(reference string) (*domain.TenantSubscriptionPayment, error) {
	return nil, nil
}

func (m *mockUSSDPaymentRepo) UpdateSubscriptionPaymentStatus(reference string, status string) error {
	return nil
}

func (m *mockUSSDPaymentRepo) LogWebhook(log *domain.PaymentWebhookLog) error {
	return nil
}

// MockSMSService for USSD testing
type mockUSSDSMSService struct {
	sentMessages []string
}

func (m *mockUSSDSMSService) SendSMS(ctx context.Context, senderID string, recipients []string, message string) error {
	m.sentMessages = append(m.sentMessages, message)
	return nil
}

func TestUSSD_MainMenu(t *testing.T) {
	cfg := &config.Config{}
	paymentRepo := &mockUSSDPaymentRepo{}
	smsSvc := &mockUSSDSMSService{}

	uc := usecase.NewUSSDUseCase(nil, paymentRepo, nil, smsSvc, cfg)

	ctx := context.Background()
	sessionID := "test-session-1"

	// 1. Initial Dial
	req := &domain.USSDRequest{
		SessionID:  sessionID,
		UserID:     "233244123456",
		NewSession: true,
	}

	resp, err := uc.ProcessRequest(ctx, req)
	assert.NoError(t, err)
	assert.True(t, resp.ContinueSession)
	assert.Contains(t, resp.Message, "Welcome to SchoolLinx")
	assert.Contains(t, resp.Message, "1. Pay School Fees")
	assert.Contains(t, resp.Message, "2. Canteen / Wallet Top-up")
	assert.Contains(t, resp.Message, "3. Check Fee Balance")

	// 2. Select Exit (0)
	req2 := &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "233244123456",
		UserData:  "0",
	}
	resp2, err := uc.ProcessRequest(ctx, req2)
	assert.NoError(t, err)
	assert.False(t, resp2.ContinueSession)
	assert.Contains(t, resp2.Message, "Goodbye")
}

func TestUSSD_FeePaymentManualStudentIDFlow(t *testing.T) {
	cfg := &config.Config{}
	paymentRepo := &mockUSSDPaymentRepo{}
	smsSvc := &mockUSSDSMSService{}

	uc := usecase.NewUSSDUseCase(nil, paymentRepo, nil, smsSvc, cfg)

	ctx := context.Background()
	sessionID := "test-fee-session"

	// 1. Dial USSD
	req1 := &domain.USSDRequest{
		SessionID:  sessionID,
		UserID:     "0244999888",
		NewSession: true,
	}
	resp1, err := uc.ProcessRequest(ctx, req1)
	assert.NoError(t, err)
	assert.True(t, resp1.ContinueSession)

	// 2. Select 1 (Pay School Fees) -> no student found by phone with nil db -> prompts for ID
	req2 := &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "0244999888",
		UserData:  "1",
	}
	resp2, err := uc.ProcessRequest(ctx, req2)
	assert.NoError(t, err)
	assert.True(t, resp2.ContinueSession)
	assert.Contains(t, resp2.Message, "Enter Student ID")

	// Manually inject session student for next step testing
	state, exists := uc.GetSession(sessionID)
	assert.True(t, exists)
	studentID := uuid.New()
	state.StudentID = &studentID
	state.StudentName = "Kwame Mensah"
	state.StudentClass = "Grade 5"
	state.BalanceDue = 350.0
	state.TenantID = "tenant-st-peters"
	state.Step = usecase.StepFeeEnterAmount

	// 3. Enter Fee Amount (e.g. 150)
	req3 := &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "0244999888",
		UserData:  "150",
	}
	resp3, err := uc.ProcessRequest(ctx, req3)
	assert.NoError(t, err)
	assert.True(t, resp3.ContinueSession)
	assert.Contains(t, resp3.Message, "Pay GHS 150.00 for Kwame Mensah")
	assert.Contains(t, resp3.Message, "1. Confirm MoMo Payment")

	// 4. Confirm Payment (1)
	req4 := &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "0244999888",
		UserData:  "1",
	}
	resp4, err := uc.ProcessRequest(ctx, req4)
	assert.NoError(t, err)
	assert.False(t, resp4.ContinueSession) // Session completes
	assert.Contains(t, resp4.Message, "A payment prompt of GHS 150.00")
	assert.Contains(t, resp4.Message, "Ref: USSD-FEE-")

	// Verify transaction was saved
	assert.Equal(t, 1, len(paymentRepo.transactions))
	assert.Equal(t, 150.0, paymentRepo.transactions[0].Amount)
	assert.Equal(t, "ARKESEL_USSD", paymentRepo.transactions[0].Provider)
	assert.True(t, strings.HasPrefix(paymentRepo.transactions[0].Reference, "USSD-FEE-"))

	// Verify SMS was dispatched
	assert.Equal(t, 1, len(smsSvc.sentMessages))
	assert.Contains(t, smsSvc.sentMessages[0], "fee payment prompt of GHS 150.00")
}

func TestUSSD_WalletTopUpFlow(t *testing.T) {
	cfg := &config.Config{}
	paymentRepo := &mockUSSDPaymentRepo{}
	smsSvc := &mockUSSDSMSService{}

	uc := usecase.NewUSSDUseCase(nil, paymentRepo, nil, smsSvc, cfg)

	ctx := context.Background()
	sessionID := "test-wallet-session"

	// 1. Start Session
	_, err := uc.ProcessRequest(ctx, &domain.USSDRequest{
		SessionID:  sessionID,
		UserID:     "0551122334",
		NewSession: true,
	})
	assert.NoError(t, err)

	// Simulate selected student in session
	state, _ := uc.GetSession(sessionID)
	studentID := uuid.New()
	state.StudentID = &studentID
	state.StudentName = "Ama Osei"
	state.StudentClass = "Form 2"
	state.PrepaidBalance = 12.50
	state.TenantID = "tenant-accra-high"
	state.Step = usecase.StepWalletEnterAmount

	// 2. Enter Top-up amount 50
	resp2, err := uc.ProcessRequest(ctx, &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "0551122334",
		UserData:  "50",
	})
	assert.NoError(t, err)
	assert.True(t, resp2.ContinueSession)
	assert.Contains(t, resp2.Message, "Top-up GHS 50.00 to Ama Osei's wallet")

	// 3. Confirm (1)
	resp3, err := uc.ProcessRequest(ctx, &domain.USSDRequest{
		SessionID: sessionID,
		UserID:    "0551122334",
		UserData:  "1",
	})
	assert.NoError(t, err)
	assert.False(t, resp3.ContinueSession)
	assert.Contains(t, resp3.Message, "Wallet top-up prompt for GHS 50.00")
	assert.Contains(t, resp3.Message, "Ref: USSD-WLT-")

	// Verify PaymentTransaction created for wallet
	assert.Equal(t, 1, len(paymentRepo.transactions))
	assert.Equal(t, 50.0, paymentRepo.transactions[0].Amount)
	assert.True(t, strings.HasPrefix(paymentRepo.transactions[0].Reference, "USSD-WLT-"))
}
