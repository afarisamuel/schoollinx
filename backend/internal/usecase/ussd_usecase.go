package usecase

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// USSD Step Constants
const (
	StepMainMenu           = "MAIN_MENU"
	StepSelectStudent      = "SELECT_STUDENT"
	StepEnterStudentID     = "ENTER_STUDENT_ID"
	StepFeeEnterAmount     = "FEE_ENTER_AMOUNT"
	StepFeeConfirmPayment  = "FEE_CONFIRM_PAYMENT"
	StepWalletEnterAmount  = "WALLET_ENTER_AMOUNT"
	StepWalletConfirm      = "WALLET_CONFIRM"
	StepBalanceDetail      = "BALANCE_DETAIL"
	StepSearchStudentInput = "SEARCH_STUDENT_INPUT"
)

type ussdUseCase struct {
	db          *gorm.DB
	paymentRepo domain.PaymentRepository
	paystackSvc domain.PaystackService
	smsProvider domain.SMSProvider
	feeNotifier FeeNotifier
	config      *config.Config
	sessions    map[string]*domain.USSDSessionState
	mu          sync.RWMutex
}

func NewUSSDUseCase(
	db *gorm.DB,
	paymentRepo domain.PaymentRepository,
	paystackSvc domain.PaystackService,
	smsProvider domain.SMSProvider,
	cfg *config.Config,
	fn ...FeeNotifier,
) domain.USSDUseCase {
	uc := &ussdUseCase{
		db:          db,
		paymentRepo: paymentRepo,
		paystackSvc: paystackSvc,
		smsProvider: smsProvider,
		config:      cfg,
		sessions:    make(map[string]*domain.USSDSessionState),
	}
	if len(fn) > 0 && fn[0] != nil {
		uc.feeNotifier = fn[0]
	}

	// Start background session cleanup routine (sessions expire after 3 minutes)
	go uc.startSessionCleaner(3 * time.Minute)

	return uc
}

func (u *ussdUseCase) startSessionCleaner(ttl time.Duration) {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		u.mu.Lock()
		now := time.Now()
		for id, session := range u.sessions {
			if now.Sub(session.UpdatedAt) > ttl {
				delete(u.sessions, id)
			}
		}
		u.mu.Unlock()
	}
}

func (u *ussdUseCase) GetSession(sessionID string) (*domain.USSDSessionState, bool) {
	u.mu.RLock()
	defer u.mu.RUnlock()
	s, ok := u.sessions[sessionID]
	return s, ok
}

func (u *ussdUseCase) ClearSession(sessionID string) {
	u.mu.Lock()
	defer u.mu.Unlock()
	delete(u.sessions, sessionID)
}

func (u *ussdUseCase) saveSession(s *domain.USSDSessionState) {
	u.mu.Lock()
	defer u.mu.Unlock()
	s.UpdatedAt = time.Now()
	u.sessions[s.SessionID] = s
}

func (u *ussdUseCase) ProcessRequest(ctx context.Context, req *domain.USSDRequest) (*domain.USSDResponse, error) {
	sessionID := strings.TrimSpace(req.SessionID)
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	phone := req.GetPhoneNumber()
	input := req.GetInput()

	// Check if this is a session release/termination
	if strings.EqualFold(req.Type, "Release") || strings.EqualFold(req.Type, "End") {
		u.ClearSession(sessionID)
		return &domain.USSDResponse{
			SessionID:       sessionID,
			UserID:          phone,
			Message:         "Thank you for using SchoolLinx.",
			ContinueSession: false,
		}, nil
	}

	session, exists := u.GetSession(sessionID)
	if !exists || req.NewSession || strings.EqualFold(req.Type, "Initiation") {
		session = &domain.USSDSessionState{
			SessionID:   sessionID,
			PhoneNumber: phone,
			Step:        StepMainMenu,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		u.saveSession(session)
		return u.renderMainMenu(session), nil
	}

	// Route based on current session step
	switch session.Step {
	case StepMainMenu:
		return u.handleMainMenuInput(ctx, session, input)

	case StepSelectStudent:
		return u.handleSelectStudentInput(ctx, session, input)

	case StepEnterStudentID:
		return u.handleEnterStudentIDInput(ctx, session, input)

	case StepFeeEnterAmount:
		return u.handleFeeEnterAmountInput(ctx, session, input)

	case StepFeeConfirmPayment:
		return u.handleFeeConfirmPaymentInput(ctx, session, input)

	case StepWalletEnterAmount:
		return u.handleWalletEnterAmountInput(ctx, session, input)

	case StepWalletConfirm:
		return u.handleWalletConfirmInput(ctx, session, input)

	case StepBalanceDetail:
		return u.handleBalanceDetailInput(ctx, session, input)

	case StepSearchStudentInput:
		return u.handleSearchStudentInput(ctx, session, input)

	default:
		session.Step = StepMainMenu
		u.saveSession(session)
		return u.renderMainMenu(session), nil
	}
}

// renderMainMenu produces the welcome landing screen
func (u *ussdUseCase) renderMainMenu(session *domain.USSDSessionState) *domain.USSDResponse {
	msg := "Welcome to SchoolLinx\n" +
		"1. Pay School Fees\n" +
		"2. Canteen / Wallet Top-up\n" +
		"3. Check Fee Balance\n" +
		"4. Student Lookup\n" +
		"0. Exit"

	return &domain.USSDResponse{
		SessionID:       session.SessionID,
		UserID:          session.PhoneNumber,
		Message:         msg,
		ContinueSession: true,
	}
}

func (u *ussdUseCase) handleMainMenuInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	switch input {
	case "1": // Pay School Fees
		session.ActionType = "FEE_PAYMENT"
		return u.initiateStudentResolution(ctx, session)

	case "2": // Wallet Top-up
		session.ActionType = "WALLET_TOPUP"
		return u.initiateStudentResolution(ctx, session)

	case "3": // Check Balance
		session.ActionType = "BALANCE_CHECK"
		return u.initiateStudentResolution(ctx, session)

	case "4": // Student Lookup
		session.ActionType = "STUDENT_SEARCH"
		session.Step = StepSearchStudentInput
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Enter Student ID / Admission No:\n(e.g., STD-001)",
			ContinueSession: true,
		}, nil

	case "0":
		u.ClearSession(session.SessionID)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Thank you for using SchoolLinx. Goodbye!",
			ContinueSession: false,
		}, nil

	default:
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Invalid selection.\n\n" + u.renderMainMenu(session).Message,
			ContinueSession: true,
		}, nil
	}
}

// initiateStudentResolution attempts to find students matching the caller's phone number
func (u *ussdUseCase) initiateStudentResolution(ctx context.Context, session *domain.USSDSessionState) (*domain.USSDResponse, error) {
	matched, err := u.findStudentsByPhone(ctx, session.PhoneNumber)
	if err != nil {
		logger.Error("USSD phone lookup error", err, zap.String("phone", session.PhoneNumber))
	}

	if len(matched) == 0 {
		// Prompt to enter Student ID manually
		session.Step = StepEnterStudentID
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Enter Student ID or Admission Number:\n(e.g., STD-2024-001)",
			ContinueSession: true,
		}, nil
	}

	if len(matched) == 1 {
		// Directly select this student
		s := matched[0]
		u.applyStudentToSession(session, s)
		return u.routeToActionMenu(session), nil
	}

	// Multiple students linked to this phone number
	session.MatchedStudents = matched
	session.Step = StepSelectStudent
	u.saveSession(session)

	var sb strings.Builder
	sb.WriteString("Select Student:\n")
	for i, s := range matched {
		sb.WriteString(fmt.Sprintf("%d. %s (%s)\n", i+1, s.StudentName, s.ClassName))
	}
	sb.WriteString(fmt.Sprintf("%d. Enter Other Student ID\n", len(matched)+1))
	sb.WriteString("0. Main Menu")

	return &domain.USSDResponse{
		SessionID:       session.SessionID,
		UserID:          session.PhoneNumber,
		Message:         sb.String(),
		ContinueSession: true,
	}, nil
}

func (u *ussdUseCase) handleSelectStudentInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	if input == "0" {
		session.Step = StepMainMenu
		u.saveSession(session)
		return u.renderMainMenu(session), nil
	}

	idx, err := strconv.Atoi(input)
	if err != nil || idx < 1 || idx > len(session.MatchedStudents)+1 {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Invalid choice. Please select a valid student from the list:\n1. Retry",
			ContinueSession: true,
		}, nil
	}

	// User selected "Enter Other Student ID"
	if idx == len(session.MatchedStudents)+1 {
		session.Step = StepEnterStudentID
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Enter Student ID or Admission Number:",
			ContinueSession: true,
		}, nil
	}

	selected := session.MatchedStudents[idx-1]
	u.applyStudentToSession(session, selected)
	return u.routeToActionMenu(session), nil
}

func (u *ussdUseCase) handleEnterStudentIDInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Student ID cannot be empty. Please enter Student ID:",
			ContinueSession: true,
		}, nil
	}

	studentSummary, err := u.findStudentByIDOrEnrollment(ctx, input)
	if err != nil || studentSummary == nil {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         fmt.Sprintf("Student with ID '%s' was not found.\n\n1. Try again\n0. Main Menu", input),
			ContinueSession: true,
		}, nil
	}

	u.applyStudentToSession(session, *studentSummary)
	return u.routeToActionMenu(session), nil
}

func (u *ussdUseCase) applyStudentToSession(session *domain.USSDSessionState, s domain.USSDStudentSummary) {
	session.StudentID = &s.StudentID
	session.TenantID = s.TenantID
	session.TenantName = s.TenantName
	session.TenantSchema = s.TenantSchema
	session.StudentName = s.StudentName
	session.StudentClass = s.ClassName
	session.EnrollmentNum = s.EnrollmentNum
	session.BalanceDue = s.BalanceDue
	session.PrepaidBalance = s.PrepaidBalance
	session.FiscalRecordID = s.FiscalRecordID
}

// routeToActionMenu decides what menu to show based on the active ActionType
func (u *ussdUseCase) routeToActionMenu(session *domain.USSDSessionState) *domain.USSDResponse {
	switch session.ActionType {
	case "FEE_PAYMENT":
		session.Step = StepFeeEnterAmount
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID: session.SessionID,
			UserID:    session.PhoneNumber,
			Message: fmt.Sprintf("%s (%s)\nOwing: GHS %.2f\n\nEnter amount to pay (GHS):",
				session.StudentName, session.StudentClass, session.BalanceDue),
			ContinueSession: true,
		}

	case "WALLET_TOPUP":
		session.Step = StepWalletEnterAmount
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID: session.SessionID,
			UserID:    session.PhoneNumber,
			Message: fmt.Sprintf("%s (%s)\nWallet Bal: GHS %.2f\n\nEnter top-up amount (GHS):",
				session.StudentName, session.StudentClass, session.PrepaidBalance),
			ContinueSession: true,
		}

	case "BALANCE_CHECK":
		session.Step = StepBalanceDetail
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID: session.SessionID,
			UserID:    session.PhoneNumber,
			Message: fmt.Sprintf("%s (%s)\n%s\nFees Due: GHS %.2f\nWallet: GHS %.2f\n\n1. Pay Fees\n2. Top-up Wallet\n0. Main Menu",
				session.StudentName, session.StudentClass, session.TenantName, session.BalanceDue, session.PrepaidBalance),
			ContinueSession: true,
		}

	default:
		session.Step = StepMainMenu
		u.saveSession(session)
		return u.renderMainMenu(session)
	}
}

// --- Fee Payment Flow ---

func (u *ussdUseCase) handleFeeEnterAmountInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	amount, err := strconv.ParseFloat(strings.TrimSpace(input), 64)
	if err != nil || amount <= 0 {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Invalid amount. Please enter a valid amount (e.g. 50):",
			ContinueSession: true,
		}, nil
	}

	session.Amount = amount
	session.Step = StepFeeConfirmPayment
	u.saveSession(session)

	return &domain.USSDResponse{
		SessionID: session.SessionID,
		UserID:    session.PhoneNumber,
		Message: fmt.Sprintf("Pay GHS %.2f for %s (%s)?\n\n1. Confirm MoMo Payment\n2. Cancel",
			amount, session.StudentName, session.StudentClass),
		ContinueSession: true,
	}, nil
}

func (u *ussdUseCase) handleFeeConfirmPaymentInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	if input != "1" {
		session.Step = StepMainMenu
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Payment cancelled.\n\n0. Main Menu",
			ContinueSession: true,
		}, nil
	}

	// Generate payment reference
	ref := fmt.Sprintf("USSD-FEE-%d-%s", time.Now().Unix(), uuid.New().String()[:6])

	// Create pending payment transaction in public schema
	pt := &domain.PaymentTransaction{
		TenantID:       session.TenantID,
		FiscalRecordID: session.FiscalRecordID,
		StudentID:      session.StudentID,
		Amount:         session.Amount,
		Reference:      ref,
		Status:         domain.PaymentStatusPending,
		Provider:       "ARKESEL_USSD",
	}

	if u.paymentRepo != nil {
		if err := u.paymentRepo.CreateTransaction(pt); err != nil {
			logger.Error("Failed to save USSD payment transaction", err, zap.String("ref", ref))
		}
	}

	// Dispatch SMS notification / receipt instructions to parent phone
	if u.smsProvider != nil && session.PhoneNumber != "" {
		smsMsg := fmt.Sprintf("SchoolLinx: A fee payment prompt of GHS %.2f for %s has been initiated. Ref: %s. Complete payment on your phone.",
			session.Amount, session.StudentName, ref)
		_ = u.smsProvider.SendSMS(ctx, domain.DefaultSMSSenderID, []string{session.PhoneNumber}, smsMsg)
	}

	u.ClearSession(session.SessionID)

	responseMsg := fmt.Sprintf("A payment prompt of GHS %.2f for %s has been sent to %s.\n\nPlease enter your Mobile Money PIN when prompted.\nRef: %s",
		session.Amount, session.StudentName, session.PhoneNumber, ref)

	return &domain.USSDResponse{
		SessionID:       session.SessionID,
		UserID:          session.PhoneNumber,
		Message:         responseMsg,
		ContinueSession: false,
	}, nil
}

// --- Wallet Top-up Flow ---

func (u *ussdUseCase) handleWalletEnterAmountInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	amount, err := strconv.ParseFloat(strings.TrimSpace(input), 64)
	if err != nil || amount <= 0 {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Invalid top-up amount. Please enter a valid number (e.g. 20):",
			ContinueSession: true,
		}, nil
	}

	session.Amount = amount
	session.Step = StepWalletConfirm
	u.saveSession(session)

	return &domain.USSDResponse{
		SessionID: session.SessionID,
		UserID:    session.PhoneNumber,
		Message: fmt.Sprintf("Top-up GHS %.2f to %s's wallet?\n\n1. Confirm MoMo Payment\n2. Cancel",
			amount, session.StudentName),
		ContinueSession: true,
	}, nil
}

func (u *ussdUseCase) handleWalletConfirmInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	if input != "1" {
		session.Step = StepMainMenu
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         "Wallet top-up cancelled.\n\n0. Main Menu",
			ContinueSession: true,
		}, nil
	}

	ref := fmt.Sprintf("USSD-WLT-%d-%s", time.Now().Unix(), uuid.New().String()[:6])

	pt := &domain.PaymentTransaction{
		TenantID:  session.TenantID,
		StudentID: session.StudentID,
		Amount:    session.Amount,
		Reference: ref,
		Status:    domain.PaymentStatusPending,
		Provider:  "ARKESEL_USSD",
	}

	if u.paymentRepo != nil {
		if err := u.paymentRepo.CreateTransaction(pt); err != nil {
			logger.Error("Failed to save USSD wallet transaction", err, zap.String("ref", ref))
		}
	}

	if u.smsProvider != nil && session.PhoneNumber != "" {
		smsMsg := fmt.Sprintf("SchoolLinx: Wallet top-up of GHS %.2f for %s initiated. Ref: %s. Approve with your MoMo PIN.",
			session.Amount, session.StudentName, ref)
		_ = u.smsProvider.SendSMS(ctx, domain.DefaultSMSSenderID, []string{session.PhoneNumber}, smsMsg)
	}

	u.ClearSession(session.SessionID)

	responseMsg := fmt.Sprintf("Wallet top-up prompt for GHS %.2f sent to %s.\n\nPlease enter your Mobile Money PIN to approve.\nRef: %s",
		session.Amount, session.PhoneNumber, ref)

	return &domain.USSDResponse{
		SessionID:       session.SessionID,
		UserID:          session.PhoneNumber,
		Message:         responseMsg,
		ContinueSession: false,
	}, nil
}

// --- Balance Detail Navigation ---

func (u *ussdUseCase) handleBalanceDetailInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	switch input {
	case "1": // Pay fees
		session.ActionType = "FEE_PAYMENT"
		session.Step = StepFeeEnterAmount
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID: session.SessionID,
			UserID:    session.PhoneNumber,
			Message: fmt.Sprintf("%s (%s)\nOwing: GHS %.2f\n\nEnter amount to pay (GHS):",
				session.StudentName, session.StudentClass, session.BalanceDue),
			ContinueSession: true,
		}, nil

	case "2": // Top-up wallet
		session.ActionType = "WALLET_TOPUP"
		session.Step = StepWalletEnterAmount
		u.saveSession(session)
		return &domain.USSDResponse{
			SessionID: session.SessionID,
			UserID:    session.PhoneNumber,
			Message: fmt.Sprintf("%s (%s)\nWallet Bal: GHS %.2f\n\nEnter top-up amount (GHS):",
				session.StudentName, session.StudentClass, session.PrepaidBalance),
			ContinueSession: true,
		}, nil

	default:
		session.Step = StepMainMenu
		u.saveSession(session)
		return u.renderMainMenu(session), nil
	}
}

// --- Student Search Flow ---

func (u *ussdUseCase) handleSearchStudentInput(ctx context.Context, session *domain.USSDSessionState, input string) (*domain.USSDResponse, error) {
	input = strings.TrimSpace(input)
	studentSummary, err := u.findStudentByIDOrEnrollment(ctx, input)
	if err != nil || studentSummary == nil {
		return &domain.USSDResponse{
			SessionID:       session.SessionID,
			UserID:          session.PhoneNumber,
			Message:         fmt.Sprintf("No student found matching '%s'.\n\n1. Try another ID\n0. Main Menu", input),
			ContinueSession: true,
		}, nil
	}

	u.applyStudentToSession(session, *studentSummary)
	session.ActionType = "BALANCE_CHECK"
	return u.routeToActionMenu(session), nil
}

// --- Database Helpers ---

// normalizePhone returns variants of a phone number to match against stored phone values
func normalizePhone(phone string) []string {
	clean := strings.ReplaceAll(phone, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.TrimPrefix(clean, "+")

	var variants []string
	variants = append(variants, clean)

	// Ghana specific normalizations
	if strings.HasPrefix(clean, "233") && len(clean) >= 12 {
		local := "0" + clean[3:]
		variants = append(variants, local, "+"+clean, clean[3:])
	} else if strings.HasPrefix(clean, "0") && len(clean) == 10 {
		intl := "233" + clean[1:]
		variants = append(variants, intl, "+"+intl, clean[1:])
	}

	return variants
}

func (u *ussdUseCase) findStudentsByPhone(ctx context.Context, rawPhone string) ([]domain.USSDStudentSummary, error) {
	if u.db == nil || rawPhone == "" {
		return nil, nil
	}

	phoneVariants := normalizePhone(rawPhone)

	// 1. Get all active tenants
	var tenants []domain.Tenant
	if err := u.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		return nil, err
	}

	var results []domain.USSDStudentSummary

	for _, t := range tenants {
		if t.SchemaName == "" {
			continue
		}

		// Inject tenant schema context for GORM tenant isolation callbacks
		tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, t.SchemaName)
		tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, t.ID)
		tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, t.Name)

		// Search students in this tenant schema with isolated preloads
		var students []domain.Student
		err := u.db.WithContext(tenantCtx).Model(&domain.Student{}).
			Preload("Class").
			Where("status = ?", domain.StatusActive).
			Find(&students).Error

		if err != nil {
			continue
		}

		for _, st := range students {
			if matchesPhone(&st, phoneVariants) {
				summary := u.buildStudentSummary(tenantCtx, t, st)
				results = append(results, summary)
			}
		}
	}

	return results, nil
}

func (u *ussdUseCase) findStudentByIDOrEnrollment(ctx context.Context, idOrEnrollment string) (*domain.USSDStudentSummary, error) {
	if u.db == nil {
		return nil, fmt.Errorf("db not initialized")
	}

	cleanInput := strings.TrimSpace(idOrEnrollment)

	var tenants []domain.Tenant
	if err := u.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		return nil, err
	}

	for _, t := range tenants {
		if t.SchemaName == "" {
			continue
		}

		tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, t.SchemaName)
		tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, t.ID)
		tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, t.Name)

		var st domain.Student
		query := u.db.WithContext(tenantCtx).Model(&domain.Student{}).Preload("Class").Where("LOWER(enrollment_num) = LOWER(?)", cleanInput)
		if parsedUUID, err := uuid.Parse(cleanInput); err == nil {
			query = u.db.WithContext(tenantCtx).Model(&domain.Student{}).Preload("Class").Where("id = ? OR LOWER(enrollment_num) = LOWER(?)", parsedUUID, cleanInput)
		}

		if err := query.First(&st).Error; err == nil && st.ID != uuid.Nil {
			summary := u.buildStudentSummary(tenantCtx, t, st)
			return &summary, nil
		}
	}

	return nil, fmt.Errorf("student not found")
}

func (u *ussdUseCase) buildStudentSummary(tenantCtx context.Context, t domain.Tenant, st domain.Student) domain.USSDStudentSummary {
	className := "Unassigned"
	if st.Class != nil && st.Class.Name != "" {
		className = st.Class.Name
	}

	fullName := strings.TrimSpace(fmt.Sprintf("%s %s", string(st.FirstName), string(st.LastName)))
	if fullName == "" {
		fullName = st.EnrollmentNum
	}

	// Query unpaid fee balance for this student in tenant schema
	var totalOwing float64
	var latestFiscalID *uuid.UUID

	var records []domain.FiscalRecord
	if err := u.db.WithContext(tenantCtx).Model(&domain.FiscalRecord{}).
		Where("student_id = ? AND status != ?", st.ID, domain.PaymentStatusPaid).
		Order("created_at desc").
		Find(&records).Error; err == nil {
		for _, rec := range records {
			due := rec.Amount - rec.AmountPaid
			if due > 0 {
				totalOwing += due
			}
			if latestFiscalID == nil {
				idCopy := rec.ID
				latestFiscalID = &idCopy
			}
		}
	}

	return domain.USSDStudentSummary{
		StudentID:      st.ID,
		TenantID:       t.ID.String(),
		TenantName:     t.Name,
		TenantSchema:   t.SchemaName,
		StudentName:    fullName,
		ClassName:      className,
		EnrollmentNum:  st.EnrollmentNum,
		BalanceDue:     totalOwing,
		PrepaidBalance: st.PrepaidBalance,
		FiscalRecordID: latestFiscalID,
	}
}

func matchesPhone(st *domain.Student, phoneVariants []string) bool {
	phonesToCheck := []string{
		string(st.PhoneNumber),
		string(st.FatherPhone),
		string(st.MotherPhone),
		string(st.GuardianPhone),
		string(st.EmergencyContactPhone),
	}

	for _, stored := range phonesToCheck {
		if stored == "" {
			continue
		}
		for _, variant := range phoneVariants {
			if strings.EqualFold(strings.TrimSpace(stored), variant) ||
				strings.HasSuffix(strings.TrimSpace(stored), variant) ||
				strings.HasSuffix(variant, strings.TrimSpace(stored)) {
				return true
			}
		}
	}
	return false
}
