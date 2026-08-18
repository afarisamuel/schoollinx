package usecase

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

type fiscalUseCase struct {
	fiscalRepo   domain.FiscalRepository
	studentRepo  domain.StudentRepository
	donationRepo domain.DonationRepository
	academicRepo domain.AcademicPeriodRepository
	tenantRepo   domain.TenantRepository
	commRepo     domain.CommunicationRepository
}

func NewFiscalUseCase(fiscalRepo domain.FiscalRepository, studentRepo domain.StudentRepository, donationRepo domain.DonationRepository, academicRepo domain.AcademicPeriodRepository, tenantRepo domain.TenantRepository, commRepo domain.CommunicationRepository) domain.FiscalUseCase {
	return &fiscalUseCase{fiscalRepo: fiscalRepo, studentRepo: studentRepo, donationRepo: donationRepo, academicRepo: academicRepo, tenantRepo: tenantRepo, commRepo: commRepo}
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
			outstandingBalance += r.Amount
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

	// Generate PDF
	var buf bytes.Buffer
	pdfService := pdf.NewPDFService()
	if err := pdfService.GeneratePupilBill(&buf, tenantName, tenant, student, records); err != nil {
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

	// Generate PDF
	var buf bytes.Buffer
	pdfService := pdf.NewPDFService()
	if err := pdfService.GenerateBulkPupilBills(&buf, tenantName, tenant, bills); err != nil {
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
	return u.fiscalRepo.Transaction(ctx, func(txRepo domain.FiscalRepository) error {
		record, err := txRepo.GetByID(ctx, recordID)
		if err != nil {
			return err
		}

		now := time.Now()
		record.AmountPaid = record.Amount
		record.Status = domain.PaymentStatusPaid
		record.PaidAt = &now

		return txRepo.Update(ctx, record)
	})
}

// ProcessPartialPayment records a partial payment against a fiscal record.
// If the cumulative paid amount reaches the full amount, the record is marked PAID.
func (u *fiscalUseCase) ProcessPartialPayment(ctx context.Context, recordID uuid.UUID, amount float64, note string) error {
	if amount <= 0 {
		return fmt.Errorf("payment amount must be greater than zero")
	}

	return u.fiscalRepo.Transaction(ctx, func(txRepo domain.FiscalRepository) error {
		record, err := txRepo.GetByID(ctx, recordID)
		if err != nil {
			return err
		}
		if record.Status == domain.PaymentStatusPaid {
			return fmt.Errorf("this invoice is already fully paid")
		}

		remaining := record.Amount - record.AmountPaid
		if amount > remaining {
			return fmt.Errorf("payment of %.2f exceeds the outstanding balance of %.2f", amount, remaining)
		}

		record.AmountPaid += amount

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

		return txRepo.Update(ctx, record)
	})
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

	var totalTermFee float64
	var breakdown []domain.FeeBreakdownItem
	for _, structure := range structures {
		if structure.IsTermFee != nil && *structure.IsTermFee {
			totalTermFee += structure.Amount
			breakdown = append(breakdown, domain.FeeBreakdownItem{
				Category: structure.Category,
				Amount:   structure.Amount,
			})
		}
	}

	if len(breakdown) == 0 {
		// Nothing to generate if there are no term fees configured
		return 0, nil
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

		record := &domain.FiscalRecord{
			StudentID:   student.ID,
			Category:    domain.CategoryTermFee,
			Amount:      totalTermFee,
			Description: "Term Fees — " + activeTerm,
			TermName:    activeTerm,
			Breakdown:   breakdown,
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
