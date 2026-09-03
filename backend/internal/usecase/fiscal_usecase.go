package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

var (
	ratesCacheMu   sync.RWMutex
	cachedRates    map[string]float64
	ratesFetchedAt time.Time
)

type fiscalUseCase struct {
	fiscalRepo   domain.FiscalRepository
	studentRepo  domain.StudentRepository
	donationRepo domain.DonationRepository
	academicRepo domain.AcademicPeriodRepository
	tenantRepo   domain.TenantRepository
	commRepo     domain.CommunicationRepository
	feeNotifier  FeeNotifier
}

func NewFiscalUseCase(
	fiscalRepo domain.FiscalRepository,
	studentRepo domain.StudentRepository,
	donationRepo domain.DonationRepository,
	academicRepo domain.AcademicPeriodRepository,
	tenantRepo domain.TenantRepository,
	commRepo domain.CommunicationRepository,
	fn ...FeeNotifier,
) domain.FiscalUseCase {
	uc := &fiscalUseCase{
		fiscalRepo:   fiscalRepo,
		studentRepo:  studentRepo,
		donationRepo: donationRepo,
		academicRepo: academicRepo,
		tenantRepo:   tenantRepo,
		commRepo:     commRepo,
	}
	if len(fn) > 0 && fn[0] != nil {
		uc.feeNotifier = fn[0]
	}
	return uc
}

func (u *fiscalUseCase) CreateFee(ctx context.Context, record *domain.FiscalRecord) error {
	if record.Status == "" {
		record.Status = domain.PaymentStatusPending
	}
	return u.fiscalRepo.Create(ctx, record)
}

func (u *fiscalUseCase) GetStudentBalance(ctx context.Context, studentID uuid.UUID) (float64, float64, []domain.FiscalRecord, error) {
	records, err := u.fiscalRepo.GetByStudent(ctx, studentID)
	if err != nil {
		return 0, 0, nil, err
	}

	var outstandingBalance float64
	for _, r := range records {
		if r.Status != domain.PaymentStatusPaid {
			rem := r.Amount - r.AmountPaid
			if rem > 0 {
				outstandingBalance += rem
			}
		}
	}

	student, err := u.studentRepo.GetByID(ctx, studentID)
	var prepaidBalance float64
	if err == nil && student != nil {
		prepaidBalance = student.PrepaidBalance
	}

	return outstandingBalance, prepaidBalance, records, nil
}

func (u *fiscalUseCase) GeneratePupilBill(ctx context.Context, studentID uuid.UUID) ([]byte, error) {
	// 1. Fetch student
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch student: %w", err)
	}

	// 2. Fetch pending fees
	records, err := u.fiscalRepo.GetByStudent(ctx, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fiscal records: %w", err)
	}

	tenantName := "KENDEMY ELITE SCHOOL"
	var tenant *domain.Tenant

	if tid, ok := middleware.GetTenantIDFromContext(ctx); ok {
		t, err := u.tenantRepo.GetByID(ctx, tid)
		if err == nil && t != nil {
			tenant = t
			tenantName = strings.ToUpper(t.Name)
		}
	} else if name, ok := middleware.GetTenantNameFromContext(ctx); ok && name != "" {
		tenantName = strings.ToUpper(name)
	}

	// Fetch bill customization configuration
	billConfig, _ := u.fiscalRepo.GetBillTemplateConfig(ctx)

	// Generate PDF
	var buf bytes.Buffer
	pdfService := pdf.NewPDFService()
	if err := pdfService.GeneratePupilBill(&buf, tenantName, tenant, student, records, billConfig); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (u *fiscalUseCase) GenerateClassBills(ctx context.Context, classID uuid.UUID) ([]byte, error) {
	// 1. Fetch all students in the class
	students, err := u.studentRepo.GetByClass(ctx, classID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch students for class: %w", err)
	}

	if len(students) == 0 {
		return nil, fmt.Errorf("no students found in this class")
	}

	tenantName := "KENDEMY ELITE SCHOOL"
	var tenant *domain.Tenant

	if tid, ok := middleware.GetTenantIDFromContext(ctx); ok {
		t, err := u.tenantRepo.GetByID(ctx, tid)
		if err == nil && t != nil {
			tenant = t
			tenantName = strings.ToUpper(t.Name)
		}
	} else if name, ok := middleware.GetTenantNameFromContext(ctx); ok && name != "" {
		tenantName = strings.ToUpper(name)
	}

	// Prepare data for PDF service
	var bills []pdf.StudentBillData
	for i := range students {
		student := &students[i]
		// Fetch fiscal records for this student
		records, err := u.fiscalRepo.GetByStudent(ctx, student.ID)
		if err != nil {
			// Skip or handle error. We will just proceed with empty records if error happens
			records = []domain.FiscalRecord{}
		}

		bills = append(bills, pdf.StudentBillData{
			Student: student,
			Records: records,
		})
	}

	// Fetch bill customization configuration
	billConfig, _ := u.fiscalRepo.GetBillTemplateConfig(ctx)

	// Generate PDF
	var buf bytes.Buffer
	pdfService := pdf.NewPDFService()
	if err := pdfService.GenerateBulkPupilBills(&buf, tenantName, tenant, bills, billConfig); err != nil {
		return nil, fmt.Errorf("failed to generate bulk PDF: %w", err)
	}

	return buf.Bytes(), nil
}

// GeneratePaymentReceipt generates a printable PDF receipt for a fiscal record.
// Only records with amount_paid > 0 (partial or full) are eligible.
func (u *fiscalUseCase) GeneratePaymentReceipt(ctx context.Context, recordID uuid.UUID) ([]byte, error) {
	record, err := u.fiscalRepo.GetByID(ctx, recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fiscal record: %w", err)
	}
	if record.AmountPaid <= 0 {
		return nil, fmt.Errorf("no payment has been made on this record — receipt is not available")
	}

	tenantName := "SCHOOL FINANCE"
	var tenant *domain.Tenant

	if tid, ok := middleware.GetTenantIDFromContext(ctx); ok {
		t, err := u.tenantRepo.GetByID(ctx, tid)
		if err == nil && t != nil {
			tenant = t
			tenantName = strings.ToUpper(t.Name)
		}
	} else if name, ok := middleware.GetTenantNameFromContext(ctx); ok && name != "" {
		tenantName = strings.ToUpper(name)
	}

	var buf bytes.Buffer
	pdfService := pdf.NewPDFService()
	if err := pdfService.GeneratePaymentReceipt(&buf, tenantName, tenant, record); err != nil {
		return nil, fmt.Errorf("failed to generate receipt PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (u *fiscalUseCase) ProcessPayment(ctx context.Context, recordID uuid.UUID) error {
	var paidRecord *domain.FiscalRecord
	var amountToPay float64

	err := u.fiscalRepo.Transaction(ctx, func(txRepo domain.FiscalRepository) error {
		record, err := txRepo.GetByID(ctx, recordID)
		if err != nil {
			return err
		}

		amountToPay = record.Amount - record.AmountPaid
		if amountToPay <= 0 {
			amountToPay = record.Amount
		}

		now := time.Now()
		record.AmountPaid = record.Amount
		record.Status = domain.PaymentStatusPaid
		record.PaidAt = &now

		paidRecord = record
		return txRepo.Update(ctx, record)
	})

	if err == nil && paidRecord != nil && u.feeNotifier != nil {
		_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
			StudentID:        paidRecord.StudentID,
			Amount:           amountToPay,
			Category:         string(paidRecord.Category),
			PaymentMethod:    "CASH",
			ReceiptReference: fmt.Sprintf("REC-%s", strings.ToUpper(paidRecord.ID.String()[:8])),
			RemainingBalance: 0,
			Note:             "Full Invoice Settlement",
		})
	}
	return err
}

// ProcessPartialPayment records a partial payment against a fiscal record.
// If the cumulative paid amount reaches the full amount, the record is marked PAID.
func (u *fiscalUseCase) ProcessPartialPayment(ctx context.Context, recordID uuid.UUID, amount float64, note string) error {
	if amount <= 0 {
		return fmt.Errorf("payment amount must be greater than zero")
	}

	var paidRecord *domain.FiscalRecord
	var remaining float64

	err := u.fiscalRepo.Transaction(ctx, func(txRepo domain.FiscalRepository) error {
		record, err := txRepo.GetByID(ctx, recordID)
		if err != nil {
			return err
		}
		if record.Status == domain.PaymentStatusPaid {
			return fmt.Errorf("this invoice is already fully paid")
		}

		rem := record.Amount - record.AmountPaid
		if amount > rem {
			return fmt.Errorf("payment of %.2f exceeds the outstanding balance of %.2f", amount, rem)
		}

		record.AmountPaid += amount
		remaining = record.Amount - record.AmountPaid

		// Record a wallet transaction as an audit trail
		_ = txRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
			StudentID:   record.StudentID,
			Type:        domain.WalletTransactionDebit,
			Amount:      amount,
			Balance:     0, // balance not wallet-based here
			Description: fmt.Sprintf("Partial payment on invoice %s: %s", record.ID.String()[:8], note),
		})

		// Mark fully paid if balance is cleared
		if record.AmountPaid >= record.Amount {
			now := time.Now()
			record.Status = domain.PaymentStatusPaid
			record.PaidAt = &now
		}

		paidRecord = record
		return txRepo.Update(ctx, record)
	})

	if err == nil && paidRecord != nil && u.feeNotifier != nil {
		_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
			StudentID:        paidRecord.StudentID,
			Amount:           amount,
			Category:         string(paidRecord.Category),
			PaymentMethod:    "CASH",
			ReceiptReference: fmt.Sprintf("REC-PART-%s", strings.ToUpper(paidRecord.ID.String()[:8])),
			RemainingBalance: remaining,
			Note:             note,
		})
	}
	return err
}

func (u *fiscalUseCase) ListAllRecords(ctx context.Context) ([]domain.FiscalRecord, error) {
	return u.fiscalRepo.GetAll(ctx)
}

func (u *fiscalUseCase) UpdateOverdueRecords(ctx context.Context) error {
	now := time.Now()
	return u.fiscalRepo.MarkOverdueRecords(ctx, now)
}

func (u *fiscalUseCase) GetSummary(ctx context.Context) (*domain.FiscalSummary, error) {
	now := time.Now()
	currentMonth := int(now.Month())
	currentYear := now.Year()
	
	return u.fiscalRepo.GetFiscalSummaryStats(ctx, currentMonth, currentYear)
}

func (u *fiscalUseCase) GenerateRecommendations(ctx context.Context) ([]domain.FinancialRecommendation, error) {
	summary, err := u.GetSummary(ctx)
	if err != nil {
		return nil, err
	}

	var recommendations []domain.FinancialRecommendation

	// 1. Cash Flow Alert
	if summary.TotalReceivables > 0 {
		collectionRate := summary.CollectionsMTD / summary.TotalReceivables
		if collectionRate < 0.20 {
			recommendations = append(recommendations, domain.FinancialRecommendation{
				Type:        "ALERT",
				Severity:    "MEDIUM",
				Title:       "Low Month-to-Date Collections",
				Description: "Collections are below 20% of expected receivables for the month.",
				Action:      "Consider offering an early payment discount or sending an automated SMS reminder to parents.",
			})
		}
	}

	// 2. Overdue Debt Warning
	if summary.TotalReceivables > 0 {
		overdueRatio := summary.TotalOverdue / summary.TotalReceivables
		if overdueRatio > 0.30 {
			recommendations = append(recommendations, domain.FinancialRecommendation{
				Type:        "ALERT",
				Severity:    "CRITICAL",
				Title:       "High Overdue Balances",
				Description: "More than 30% of total expected revenue is currently overdue.",
				Action:      "Initiate immediate collection campaigns or restrict portal access for chronic debtors.",
			})
		} else if overdueRatio > 0.15 {
			recommendations = append(recommendations, domain.FinancialRecommendation{
				Type:        "ALERT",
				Severity:    "HIGH",
				Title:       "Growing Overdue Accounts",
				Description: "Overdue accounts represent over 15% of expected revenue.",
				Action:      "Send a batch of reminder emails to accounts more than 7 days overdue.",
			})
		}
	}

	// 3. General Revenue Opportunity
	if len(recommendations) == 0 {
		recommendations = append(recommendations, domain.FinancialRecommendation{
			Type:        "OPTIMIZATION",
			Severity:    "LOW",
			Title:       "Finances Healthy",
			Description: "Fee collection is on track for this period.",
			Action:      "Review upcoming term fee structures for potential inflation adjustments.",
		})
	}

	return recommendations, nil
}

func (u *fiscalUseCase) SetFeeStructure(ctx context.Context, structure *domain.FeeStructure) error {
	return u.fiscalRepo.SaveFeeStructure(ctx, structure)
}

func (u *fiscalUseCase) DeleteFeeStructure(ctx context.Context, id uuid.UUID) error {
	return u.fiscalRepo.DeleteFeeStructure(ctx, id)
}

func (u *fiscalUseCase) GetFeeStructuresByPeriod(ctx context.Context, periodID uuid.UUID) ([]domain.FeeStructure, error) {
	return u.fiscalRepo.GetFeeStructuresByPeriod(ctx, periodID)
}

func (u *fiscalUseCase) GenerateTermFees(ctx context.Context, periodID uuid.UUID) (int, error) {
	// Look up the active term for this period
	period, err := u.academicRepo.GetByID(ctx, periodID)
	if err != nil {
		return 0, err
	}

	// Find the activated term by current_term number
	activeTerm := ""
	dueDate := time.Now().AddDate(0, 1, 0) // default: 30 days
	if period != nil {
		for _, t := range period.Terms {
			if t.TermNumber == period.CurrentTerm {
				activeTerm = t.Name
				// Set due date to end of the active term
				if !t.EndDate.IsZero() {
					dueDate = t.EndDate
				}
				break
			}
		}
	}

	structures, err := u.GetFeeStructuresByPeriod(ctx, periodID)
	if err != nil || len(structures) == 0 {
		return 0, err
	}

	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return 0, err
	}

	generatedCount := 0
	for _, student := range students {
		// Prevent duplicates: Check if a TERM_FEE for this specific term already exists for the student
		existingRecords, err := u.fiscalRepo.GetByStudent(ctx, student.ID)
		alreadyGenerated := false
		if err == nil {
			for _, rec := range existingRecords {
				if rec.Category == domain.CategoryTermFee && rec.TermName == activeTerm {
					alreadyGenerated = true
					break
				}
			}
		}

		if alreadyGenerated {
			continue // Skip this student
		}

		var studentTotalFee float64
		var studentBreakdown []domain.FeeBreakdownItem

		for _, structure := range structures {
			if structure.IsTermFee == nil || !*structure.IsTermFee {
				continue
			}

			// Check if this fee structure applies to this student's class
			applies := false
			if structure.AllClasses || len(structure.ClassIDs) == 0 {
				applies = true
			} else if student.ClassID != nil {
				studentClassIDStr := student.ClassID.String()
				for _, cid := range structure.ClassIDs {
					if cid == studentClassIDStr {
						applies = true
						break
					}
				}
			}

			if applies {
				studentTotalFee += structure.Amount
				studentBreakdown = append(studentBreakdown, domain.FeeBreakdownItem{
					Category: structure.Category,
					Amount:   structure.Amount,
				})
			}
		}

		if len(studentBreakdown) == 0 || studentTotalFee <= 0 {
			// No applicable fees for this student
			continue
		}

		record := &domain.FiscalRecord{
			StudentID:   student.ID,
			Category:    domain.CategoryTermFee,
			Amount:      studentTotalFee,
			Description: "Term Fees — " + activeTerm,
			TermName:    activeTerm,
			Breakdown:   studentBreakdown,
			Status:      domain.PaymentStatusPending,
			DueDate:     dueDate,
		}
		if errCreate := u.fiscalRepo.Create(ctx, record); errCreate == nil {
			generatedCount++
		}
	}

	return generatedCount, nil
}

func (u *fiscalUseCase) ProcessDonation(ctx context.Context, donation *domain.Donation) error {
	return u.donationRepo.Create(ctx, donation)
}

func (u *fiscalUseCase) GetDonationsByDonor(ctx context.Context, donorID uuid.UUID) ([]domain.Donation, error) {
	return u.donationRepo.GetByDonor(ctx, donorID)
}

// TopUpWallet adds funds to a student's prepaid balance.
// It first settles any PENDING/OVERDUE invoices before depositing the remainder.
func (u *fiscalUseCase) TopUpWallet(ctx context.Context, studentID uuid.UUID, amount float64, description string) error {
	return u.fiscalRepo.Transaction(ctx, func(txRepo domain.FiscalRepository) error {
		student, err := u.studentRepo.GetByID(ctx, studentID)
		if err != nil {
			return err
		}

		remaining := amount

		// 1. Auto-settle pending debts (oldest first)
		pendingRecords, _ := txRepo.GetPendingByStudent(ctx, studentID)
		for _, record := range pendingRecords {
			if remaining <= 0 {
				break
			}
			if remaining >= record.Amount {
				// Fully settle this invoice
				remaining -= record.Amount
				now := time.Now()
				record.Status = domain.PaymentStatusPaid
				record.PaidAt = &now
				_ = txRepo.Update(ctx, &record)

				// Record the debit transaction for the debt settlement
				_ = txRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
					StudentID:   studentID,
					Type:        domain.WalletTransactionDebit,
					Amount:      record.Amount,
					Balance:     student.PrepaidBalance, // will be updated at the end
					Description: "Auto-settled: " + string(record.Category) + " invoice",
				})
			}
			// Partial payments not supported in this version — skip if not enough
		}

		// 2. Deposit remainder into wallet
		student.PrepaidBalance += remaining
		if err := u.studentRepo.Update(ctx, student); err != nil {
			return err
		}

		// 3. Record the credit transaction
		desc := description
		if desc == "" {
			desc = "Wallet top-up"
		}
		return txRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
			StudentID:   studentID,
			Type:        domain.WalletTransactionCredit,
			Amount:      amount,
			Balance:     student.PrepaidBalance,
			Description: desc,
		})
	})
}

// GetWalletInfo returns the student's current prepaid balance and transaction history.
func (u *fiscalUseCase) GetWalletInfo(ctx context.Context, studentID uuid.UUID) (float64, []domain.WalletTransaction, error) {
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return 0, nil, err
	}
	txns, err := u.fiscalRepo.GetWalletTransactions(ctx, studentID)
	if err != nil {
		return student.PrepaidBalance, nil, err
	}
	return student.PrepaidBalance, txns, nil
}

// ProcessCanteenPurchase handles a digital wallet transaction for a canteen item
func (u *fiscalUseCase) ProcessCanteenPurchase(ctx context.Context, studentID uuid.UUID, amount float64, item string) error {
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return err
	}

	if student.PrepaidBalance < amount {
		return fmt.Errorf("insufficient wallet balance (balance: %.2f, required: %.2f)", student.PrepaidBalance, amount)
	}

	student.PrepaidBalance -= amount
	if err := u.studentRepo.Update(ctx, student); err != nil {
		return err
	}

	return u.fiscalRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
		StudentID:   studentID,
		Type:        domain.WalletTransactionDebit,
		Amount:      amount,
		Balance:     student.PrepaidBalance,
		Description: "Canteen purchase: " + item,
	})
}

// ProcessAttendanceBilling is called when a student is marked Present.
// It calculates the total DAILY fees for the active period, then either
// deducts from PrepaidBalance or creates a PENDING invoice.
func (u *fiscalUseCase) ProcessAttendanceBilling(ctx context.Context, studentID uuid.UUID, periodID uuid.UUID) error {
	// 1. Get all DAILY fee structures for this period
	dailyFees, err := u.fiscalRepo.GetFeeStructuresByFrequency(ctx, periodID, domain.FrequencyDaily)
	if err != nil || len(dailyFees) == 0 {
		return err // No daily fees configured — nothing to bill
	}

	// 2. Calculate total daily cost
	var totalDailyCost float64
	for _, fee := range dailyFees {
		totalDailyCost += fee.Amount
	}
	if totalDailyCost == 0 {
		return nil
	}

	// 3. Get the student
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return err
	}

	// 4. Try to deduct from prepaid balance
	if student.PrepaidBalance >= totalDailyCost {
		student.PrepaidBalance -= totalDailyCost
		if err := u.studentRepo.Update(ctx, student); err != nil {
			return err
		}

		// Record a debit transaction for each fee category
		for _, fee := range dailyFees {
			_ = u.fiscalRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
				StudentID:   studentID,
				Type:        domain.WalletTransactionDebit,
				Amount:      fee.Amount,
				Balance:     student.PrepaidBalance,
				Description: "Daily " + string(fee.Category) + " fee deduction",
			})
		}
		return nil
	}

	// 5. Insufficient balance — generate invoices for each daily fee
	for _, fee := range dailyFees {
		record := &domain.FiscalRecord{
			StudentID:   studentID,
			Category:    fee.Category,
			Amount:      fee.Amount,
			Description: "Daily " + string(fee.Category) + " fee (attendance-based)",
			Status:      domain.PaymentStatusPending,
			DueDate:     time.Now().AddDate(0, 0, 7), // Due in 7 days
		}
		_ = u.fiscalRepo.Create(ctx, record)
	}

	return nil
}

// Budget & Expenses implementations

func (u *fiscalUseCase) SetBudget(ctx context.Context, budget *domain.Budget) error {
	return u.fiscalRepo.CreateBudget(ctx, budget)
}

func (u *fiscalUseCase) GetBudgets(ctx context.Context, academicYear string) ([]domain.Budget, error) {
	return u.fiscalRepo.GetBudgets(ctx, academicYear)
}

func (u *fiscalUseCase) RecordExpenditure(ctx context.Context, exp *domain.Expenditure) error {
	if err := u.fiscalRepo.CreateExpenditure(ctx, exp); err != nil {
		return err
	}
	return u.fiscalRepo.UpdateBudgetSpent(ctx, exp.BudgetID, exp.Amount)
}

func (u *fiscalUseCase) SubmitExpenseClaim(ctx context.Context, claim *domain.ExpenseClaim) error {
	claim.Status = "PENDING_MANAGER"
	return u.fiscalRepo.CreateExpenseClaim(ctx, claim)
}

func (u *fiscalUseCase) GetExpenseClaims(ctx context.Context, status string) ([]domain.ExpenseClaim, error) {
	return u.fiscalRepo.GetExpenseClaims(ctx, status)
}

func (u *fiscalUseCase) ReviewExpenseClaim(ctx context.Context, claimID uuid.UUID, reviewerID uuid.UUID, approved bool) error {
	claim, err := u.fiscalRepo.GetExpenseClaimByID(ctx, claimID)
	if err != nil {
		return err
	}

	newStatus := claim.Status
	switch claim.Status {
	case "PENDING_MANAGER":
		if approved {
			newStatus = "PENDING_FINANCE"
		} else {
			newStatus = "REJECTED"
		}
	case "PENDING_FINANCE":
		if approved {
			newStatus = "APPROVED"
		} else {
			newStatus = "REJECTED"
		}
	}

	return u.fiscalRepo.UpdateExpenseClaimStatus(ctx, claimID, newStatus, reviewerID)
}

func (u *fiscalUseCase) GetDebtAgeing(ctx context.Context) (*domain.DebtAgeingReport, error) {
	report := &domain.DebtAgeingReport{}

	b30, err := u.fiscalRepo.GetDefaultersOlderThan(ctx, 0)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	for _, r := range b30 {
		daysDue := int(now.Sub(r.DueDate).Hours() / 24)
		switch {
		case daysDue <= 30:
			report.Bucket30 = append(report.Bucket30, r)
			report.Total30 += r.Amount
		case daysDue <= 60:
			report.Bucket60 = append(report.Bucket60, r)
			report.Total60 += r.Amount
		case daysDue <= 90:
			report.Bucket90 = append(report.Bucket90, r)
			report.Total90 += r.Amount
		default:
			report.BucketOld = append(report.BucketOld, r)
			report.TotalOld += r.Amount
		}
	}
	return report, nil
}

func (u *fiscalUseCase) EscalateFeeReminders(ctx context.Context) error {
	// Query overdue records
	// For each, calculate days overdue and create a reminder
	// To keep it simple, we get all overdue records.
	// In a real scenario we'd query by `due_date`.
	
	now := time.Now()
	// Update status first
	if err := u.UpdateOverdueRecords(ctx); err != nil {
		return fmt.Errorf("failed to update overdue records: %w", err)
	}
	
	records, err := u.fiscalRepo.GetAll(ctx) // Inefficient for large DBs but acceptable for now without custom repo method
	if err != nil {
		return err
	}
	
	for _, record := range records {
		if record.Status == domain.PaymentStatusOverdue {
			daysOverdue := int(now.Sub(record.DueDate).Hours() / 24)
			
			// Simple escalation logic: send at 1, 7, 14, 30 days
			if daysOverdue == 1 || daysOverdue == 7 || daysOverdue == 14 || daysOverdue == 30 {
				reminder := &domain.Reminder{
					Title:          fmt.Sprintf("Fee Reminder: %d Days Overdue", daysOverdue),
					Message:        fmt.Sprintf("Dear Guardian, your ward %s %s has an outstanding fee of GH₵%.2f for %s.", record.Student.FirstName, record.Student.LastName, record.BalanceDue, record.Category),
					TargetAudience: "FEE_DEFAULTERS",
					SendDate:       now,
					Status:         "PENDING",
					Channel:        "SMS",
				}
				_ = u.commRepo.CreateReminder(ctx, reminder)
			}
		}
	}
	
	return nil
}

func (u *fiscalUseCase) ApplyScholarship(ctx context.Context, scholarship *domain.Scholarship) error {
	return u.fiscalRepo.CreateScholarship(ctx, scholarship)
}

func (u *fiscalUseCase) GetScholarshipsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.Scholarship, error) {
	return u.fiscalRepo.GetScholarshipsByStudent(ctx, studentID)
}

func (u *fiscalUseCase) GetAllScholarships(ctx context.Context) ([]domain.Scholarship, error) {
	return u.fiscalRepo.GetAllScholarships(ctx)
}

func (u *fiscalUseCase) UpdateScholarshipStatus(ctx context.Context, id uuid.UUID, status domain.ScholarshipStatus) error {
	scholarship, err := u.fiscalRepo.GetScholarshipByID(ctx, id)
	if err != nil {
		return err
	}
	scholarship.Status = status
	return u.fiscalRepo.UpdateScholarship(ctx, scholarship)
}


func (u *fiscalUseCase) GetYearEndSummary(ctx context.Context) (*domain.YearEndSummary, error) {
	records, err := u.fiscalRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	summary := &domain.YearEndSummary{}
	studentSet := make(map[string]bool)

	for _, r := range records {
		if r.Status == domain.PaymentStatusPaid {
			continue
		}
		balance := r.Amount - r.AmountPaid
		if balance <= 0 {
			continue
		}
		summary.TotalOutstanding += balance
		if r.Status == domain.PaymentStatusOverdue {
			summary.TotalOverdue += balance
		}
		summary.TotalCarryOver += balance
		studentSet[r.StudentID.String()] = true
	}
	summary.StudentsWithDebt = len(studentSet)
	return summary, nil
}

func (u *fiscalUseCase) PerformYearEndRollover(ctx context.Context, newPeriodID uuid.UUID) (*domain.YearEndResult, error) {
	// 1. Ensure the new period exists
	_, err := u.academicRepo.GetByID(ctx, newPeriodID)
	if err != nil {
		return nil, fmt.Errorf("new academic period not found: %w", err)
	}

	// 2. Get all unpaid records
	records, err := u.fiscalRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fiscal records: %w", err)
	}

	result := &domain.YearEndResult{}
	now := time.Now()

	for _, r := range records {
		if r.Status == domain.PaymentStatusPaid {
			continue
		}
		balance := r.Amount - r.AmountPaid
		if balance <= 0 {
			continue
		}

		// Create a carry-over record in the new period
		carryOver := &domain.FiscalRecord{
			StudentID:   r.StudentID,
			Category:    r.Category,
			Amount:      balance,
			AmountPaid:  0,
			Description: fmt.Sprintf("Carry-over from previous year: %s", r.Description),
			Status:      domain.PaymentStatusPending,
			DueDate:     now.AddDate(0, 1, 0), // Due in 1 month
		}
		if createErr := u.fiscalRepo.Create(ctx, carryOver); createErr == nil {
			result.RecordsCarriedOver++
			result.TotalAmountRolled += balance
		}
	}

	// 3. Revoke expired scholarships
	scholarships, _ := u.fiscalRepo.GetActiveScholarships(ctx)
	for _, s := range scholarships {
		if s.ValidUntil.Before(now) {
			s.Status = domain.ScholarshipStatusRevoked
			_ = u.fiscalRepo.UpdateScholarship(ctx, &s)
			result.ScholarshipsRevoked++
		}
	}

	result.Message = fmt.Sprintf(
		"Year-end rollover complete. %d unpaid records carried over (GH₵%.2f total). %d expired scholarships revoked.",
		result.RecordsCarriedOver, result.TotalAmountRolled, result.ScholarshipsRevoked,
	)
	return result, nil
}

// Milestone 2 Features

func (u *fiscalUseCase) CreateInstallmentAgreement(ctx context.Context, studentID, recordID uuid.UUID, milestones []domain.InstallmentMilestone) (*domain.InstallmentAgreement, error) {
	record, err := u.fiscalRepo.GetByID(ctx, recordID)
	if err != nil {
		return nil, fmt.Errorf("fiscal record not found: %w", err)
	}

	agreement := &domain.InstallmentAgreement{
		ID:             uuid.New(),
		StudentID:      studentID,
		FiscalRecordID: recordID,
		TotalAmount:    record.Amount,
		AmountPaid:     0,
		Status:         "ACTIVE",
		PenaltyPct:     5.0, // Default 5% late penalty
	}

	// Persist milestones
	for i, m := range milestones {
		m.ID = uuid.New()
		m.AgreementID = agreement.ID
		m.Index = i + 1
		m.Status = "PENDING"
		m.AmountPaid = 0
		agreement.Milestones = append(agreement.Milestones, m)
	}

	if err := u.fiscalRepo.CreateInstallmentAgreement(ctx, agreement); err != nil {
		return nil, err
	}

	return agreement, nil
}

func (u *fiscalUseCase) GetStudentInstallments(ctx context.Context, studentID uuid.UUID) ([]domain.InstallmentAgreement, error) {
	return u.fiscalRepo.GetInstallmentAgreementsByStudent(ctx, studentID)
}

func (u *fiscalUseCase) PayInstallmentMilestone(ctx context.Context, milestoneID uuid.UUID, amount float64) error {
	m, err := u.fiscalRepo.GetInstallmentMilestoneByID(ctx, milestoneID)
	if err != nil {
		return fmt.Errorf("milestone not found: %w", err)
	}

	newPaid := m.AmountPaid + amount
	status := m.Status
	if newPaid >= m.Amount {
		status = "PAID"
	}

	err = u.fiscalRepo.UpdateInstallmentMilestone(ctx, milestoneID, newPaid, status)
	if err == nil && u.feeNotifier != nil {
		agreement, _ := u.fiscalRepo.GetInstallmentAgreementByID(ctx, m.AgreementID)
		if agreement != nil {
			rem := m.Amount - newPaid
			if rem < 0 {
				rem = 0
			}
			_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
				StudentID:        agreement.StudentID,
				Amount:           amount,
				Category:         "INSTALLMENT",
				PaymentMethod:    "DIRECT",
				ReceiptReference: fmt.Sprintf("MILESTONE-%s", strings.ToUpper(milestoneID.String()[:8])),
				RemainingBalance: rem,
				Note:             fmt.Sprintf("Installment Milestone due %s", m.DueDate.Format("02-Jan-2006")),
			})
		}
	}
	return err
}

func (u *fiscalUseCase) CalculateSiblingDiscount(ctx context.Context, studentID uuid.UUID, customBase *float64) (*domain.SiblingDiscountCalculation, error) {
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return nil, fmt.Errorf("student not found: %w", err)
	}

	// 1. Determine baseline tuition dynamically (from custom parameter, active FeeStructure, or student invoice)
	baseTuition := 0.0
	if customBase != nil && *customBase > 0 {
		baseTuition = *customBase
	} else if activePeriod, err := u.academicRepo.GetActive(ctx); err == nil && activePeriod != nil {
		structures, _ := u.fiscalRepo.GetFeeStructuresByPeriod(ctx, activePeriod.ID)
		for _, fs := range structures {
			if fs.Category == domain.CategoryTuition || fs.Category == domain.CategoryTermFee {
				baseTuition += fs.Amount
			}
		}
	}

	// Fallback to student's pending tuition record if not set in fee structure
	if baseTuition == 0 {
		records, _ := u.fiscalRepo.GetPendingByStudent(ctx, studentID)
		for _, r := range records {
			if r.Category == domain.CategoryTuition || r.Category == domain.CategoryTermFee {
				baseTuition = r.Amount
				break
			}
		}
	}

	// Fallback default only if the school hasn't configured any fee structure yet
	if baseTuition == 0 {
		baseTuition = 2500.0
	}

	childOrder := 1
	allStudents, err := u.studentRepo.GetAll(ctx)
	if err == nil {
		phoneA := string(student.FatherPhone)
		if phoneA == "" {
			phoneA = string(student.MotherPhone)
		}
		if phoneA == "" {
			phoneA = string(student.GuardianPhone)
		}

		if phoneA != "" {
			count := 0
			for _, s := range allStudents {
				p := string(s.FatherPhone)
				if p == "" {
					p = string(s.MotherPhone)
				}
				if p == "" {
					p = string(s.GuardianPhone)
				}
				if p == phoneA {
					count++
					if s.ID == studentID {
						childOrder = count
					}
				}
			}
		}
	}

	discountPct := 0.0
	reason := "Standard 1st Ward Rate"

	if childOrder == 2 {
		discountPct = 10.0
		reason = "2nd Ward Sibling Discount (10% Off)"
	} else if childOrder >= 3 {
		discountPct = 20.0
		reason = fmt.Sprintf("%dth Ward Multi-Sibling Discount (20%% Off)", childOrder)
	}

	discountAmount := (baseTuition * discountPct) / 100.0
	finalFee := baseTuition - discountAmount

	return &domain.SiblingDiscountCalculation{
		StudentID:      studentID,
		ChildOrder:     childOrder,
		OriginalFee:    baseTuition,
		DiscountPct:    discountPct,
		DiscountAmount: discountAmount,
		FinalFee:       finalFee,
		Reason:         reason,
	}, nil
}

func (u *fiscalUseCase) SetBaselineTuition(ctx context.Context, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("baseline tuition must be greater than zero")
	}

	activePeriod, err := u.academicRepo.GetActive(ctx)
	if err != nil || activePeriod == nil {
		return fmt.Errorf("no active academic period found to set tuition baseline: %w", err)
	}

	isTermFee := true
	structure := &domain.FeeStructure{
		AcademicPeriodID: activePeriod.ID,
		Category:         domain.CategoryTuition,
		Amount:           amount,
		Frequency:        domain.FrequencyTermly,
		IsTermFee:        &isTermFee,
	}

	return u.fiscalRepo.SaveFeeStructure(ctx, structure)
}

func (u *fiscalUseCase) GetExchangeRates(ctx context.Context) (map[string]float64, error) {
	ratesCacheMu.RLock()
	if cachedRates != nil && time.Since(ratesFetchedAt) < 1*time.Hour {
		rates := make(map[string]float64, len(cachedRates))
		for k, v := range cachedRates {
			rates[k] = v
		}
		ratesCacheMu.RUnlock()
		return rates, nil
	}
	ratesCacheMu.RUnlock()

	// Live API lookup from exchangerate-api
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://api.exchangerate-api.com/v4/latest/USD")
	if err != nil {
		ratesCacheMu.RLock()
		if cachedRates != nil {
			rates := cachedRates
			ratesCacheMu.RUnlock()
			return rates, nil
		}
		ratesCacheMu.RUnlock()
		return map[string]float64{
			"GHS": 1.0,
			"USD": 15.55,
			"GBP": 19.80,
			"EUR": 16.90,
			"NGN": 0.011,
		}, nil
	}
	defer resp.Body.Close()

	var apiResp struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return map[string]float64{"GHS": 1.0, "USD": 15.55, "GBP": 19.80, "EUR": 16.90, "NGN": 0.011}, nil
	}

	ghsRate := apiResp.Rates["GHS"]
	if ghsRate <= 0 {
		ghsRate = 15.55
	}

	liveRates := map[string]float64{
		"GHS": 1.0,
		"USD": math.Round(ghsRate*100) / 100,
		"GBP": math.Round((1.0/apiResp.Rates["GBP"])*ghsRate*100) / 100,
		"EUR": math.Round((1.0/apiResp.Rates["EUR"])*ghsRate*100) / 100,
		"NGN": math.Round((ghsRate/apiResp.Rates["NGN"])*10000) / 10000,
	}

	ratesCacheMu.Lock()
	cachedRates = liveRates
	ratesFetchedAt = time.Now()
	ratesCacheMu.Unlock()

	return liveRates, nil
}

func (u *fiscalUseCase) GetInstallmentPlanTemplate(ctx context.Context) (*domain.InstallmentPlanTemplate, error) {
	return u.fiscalRepo.GetInstallmentPlanTemplate(ctx)
}

func (u *fiscalUseCase) SaveInstallmentPlanTemplate(ctx context.Context, template *domain.InstallmentPlanTemplate) (*domain.InstallmentPlanTemplate, error) {
	if template.Name == "" {
		template.Name = "Custom Installment Plan"
	}
	if template.ScheduleText == "" && len(template.Milestones) > 0 {
		var parts []string
		for _, m := range template.Milestones {
			parts = append(parts, fmt.Sprintf("%.0f%%", m.Percentage))
		}
		template.ScheduleText = strings.Join(parts, " / ") + " Schedule"
	}
	if err := u.fiscalRepo.SaveInstallmentPlanTemplate(ctx, template); err != nil {
		return nil, err
	}
	return template, nil
}

func (u *fiscalUseCase) GetBillTemplateConfig(ctx context.Context) (*domain.BillTemplateConfig, error) {
	return u.fiscalRepo.GetBillTemplateConfig(ctx)
}

func (u *fiscalUseCase) SaveBillTemplateConfig(ctx context.Context, config *domain.BillTemplateConfig) (*domain.BillTemplateConfig, error) {
	if config.Title == "" {
		config.Title = "PUPIL BILL FOR TERM"
	}
	if config.SuppliesTitle == "" {
		config.SuppliesTitle = "REQUIRED BOOKS & MATERIALS TO BE BROUGHT / PURCHASED"
	}
	if err := u.fiscalRepo.SaveBillTemplateConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to save bill template config: %w", err)
	}
	return u.fiscalRepo.GetBillTemplateConfig(ctx)
}




