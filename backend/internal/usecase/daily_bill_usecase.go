package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type dailyBillUseCase struct {
	billRepo      domain.DailyBillRepository
	studentRepo   domain.StudentRepository
	fiscalRepo    domain.FiscalRepository
	logisticsRepo domain.LogisticsRepository
	feeNotifier   FeeNotifier
}

func NewDailyBillUseCase(
	billRepo domain.DailyBillRepository,
	studentRepo domain.StudentRepository,
	fiscalRepo domain.FiscalRepository,
	logisticsRepo domain.LogisticsRepository,
	fn ...FeeNotifier,
) domain.DailyBillUseCase {
	uc := &dailyBillUseCase{
		billRepo:      billRepo,
		studentRepo:   studentRepo,
		fiscalRepo:    fiscalRepo,
		logisticsRepo: logisticsRepo,
	}
	if len(fn) > 0 && fn[0] != nil {
		uc.feeNotifier = fn[0]
	}
	return uc
}

func (u *dailyBillUseCase) processBillWithWallet(ctx context.Context, student *domain.Student, amount float64, today time.Time, category string) domain.DailyBill {
	status := domain.DailyBillPending
	var collectedAt *time.Time
	if student.PrepaidBalance >= amount && amount > 0 {
		now := time.Now()
		student.PrepaidBalance -= amount
		_ = u.studentRepo.Update(ctx, student)
		_ = u.fiscalRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
			StudentID:   student.ID,
			Type:        domain.WalletTransactionDebit,
			Amount:      amount,
			Balance:     student.PrepaidBalance,
			Description: fmt.Sprintf("Daily Fee Auto-Deduction (%s)", category),
		})
		status = domain.DailyBillPaid
		collectedAt = &now

		if u.feeNotifier != nil {
			_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
				StudentID:        student.ID,
				Amount:           amount,
				Category:         "DAILY_FEE",
				PaymentMethod:    "WALLET_AUTODEDUCT",
				ReceiptReference: fmt.Sprintf("AUTO-%s", strings.ToUpper(student.ID.String()[:8])),
				RemainingBalance: student.PrepaidBalance,
				Note:             fmt.Sprintf("Daily Fee Auto-Deduction (%s) for %s %s", category, student.FirstName, student.LastName),
			})
		}
	}
	return domain.DailyBill{
		StudentID:   student.ID,
		Amount:      amount,
		Date:        today,
		Status:      status,
		CollectedAt: collectedAt,
	}
}

// GenerateDailyBills creates a bill for every active student for today, if not already generated.
func (u *dailyBillUseCase) GenerateDailyBills(ctx context.Context, amount float64) (int, error) {
	today := time.Now()

	// Idempotency: do not double-generate for the same day
	exists, err := u.billRepo.ExistsForDate(ctx, today)
	if err != nil {
		return 0, fmt.Errorf("failed to check existing bills: %w", err)
	}
	if exists {
		return 0, fmt.Errorf("daily bills for today (%s) have already been generated", today.Format("2006-01-02"))
	}

	students, err := u.studentRepo.GetAll(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch students: %w", err)
	}

	bills := make([]domain.DailyBill, 0, len(students))
	for _, s := range students {
		st := s
		bills = append(bills, u.processBillWithWallet(ctx, &st, amount, today, "Daily Attendance & Services"))
	}

	if err := u.billRepo.BulkCreate(ctx, bills); err != nil {
		return 0, fmt.Errorf("failed to generate bills: %w", err)
	}
	return len(bills), nil
}

// GetTodaysBills returns all bills (any status) for today.
func (u *dailyBillUseCase) GetTodaysBills(ctx context.Context) ([]domain.DailyBill, error) {
	return u.billRepo.GetByDate(ctx, time.Now())
}

// GetPendingBills returns all PENDING bills for today.
func (u *dailyBillUseCase) GetPendingBills(ctx context.Context) ([]domain.DailyBill, error) {
	return u.billRepo.GetPendingByDate(ctx, time.Now())
}

// GetStudentDailyBills returns all bills for a specific student.
func (u *dailyBillUseCase) GetStudentDailyBills(ctx context.Context, studentID uuid.UUID) ([]domain.DailyBill, error) {
	return u.billRepo.GetByStudent(ctx, studentID)
}

// CollectBill marks a bill as PAID and records the collector's ID.
func (u *dailyBillUseCase) CollectBill(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error {
	bill, err := u.billRepo.GetByID(ctx, billID)
	if err != nil {
		return fmt.Errorf("bill not found: %w", err)
	}
	if bill.Status != domain.DailyBillPending {
		return fmt.Errorf("bill is already %s", bill.Status)
	}
	err = u.billRepo.MarkPaid(ctx, billID, collectorID)
	if err == nil && u.feeNotifier != nil {
		_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
			StudentID:        bill.StudentID,
			Amount:           bill.Amount,
			Category:         "DAILY_FEE",
			PaymentMethod:    "CASH",
			ReceiptReference: fmt.Sprintf("DAILY-%s", strings.ToUpper(bill.ID.String()[:8])),
			RemainingBalance: 0,
			Note:             "Daily Bill Collection",
		})
	}
	return err
}

// GetMyCollections returns all bills collected by a staff member today, plus a total.
func (u *dailyBillUseCase) GetMyCollections(ctx context.Context, collectorID uuid.UUID) ([]domain.DailyBill, float64, error) {
	bills, err := u.billRepo.GetCollectionsByCollector(ctx, collectorID, time.Now())
	if err != nil {
		return nil, 0, err
	}
	var total float64
	for _, b := range bills {
		total += b.Amount
	}
	return bills, total, nil
}

// RunOverdueCheck marks all PENDING bills from previous days as OVERDUE.
func (u *dailyBillUseCase) RunOverdueCheck(ctx context.Context) (int64, error) {
	today := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), 0, 0, 0, 0, time.Now().Location())
	return u.billRepo.MarkOverdue(ctx, today)
}

// GenerateDailyBillsFromConfig reads all DAILY fee structures for the active period,
// sums them, and generates today's bills for every student at that computed amount.
func (u *dailyBillUseCase) GenerateDailyBillsFromConfig(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error) {
	// 1. Fetch DAILY fee structures for this period
	dailyFees, err := u.fiscalRepo.GetFeeStructuresByFrequency(ctx, periodID, domain.FrequencyDaily)
	if err != nil {
		return 0, 0, nil, fmt.Errorf("failed to fetch daily fee configurations: %w", err)
	}
	if len(dailyFees) == 0 {
		return 0, 0, nil, fmt.Errorf("no DAILY fee structures configured for this academic period — please add one under Configure Fees")
	}

	// 2. Sum up all DAILY fees
	var totalAmount float64
	categoryNames := make([]string, 0, len(dailyFees))
	for _, fee := range dailyFees {
		totalAmount += fee.Amount
		categoryNames = append(categoryNames, string(fee.Category))
	}

	// 3. Generate bills at the summed amount
	count, err := u.GenerateDailyBills(ctx, totalAmount)
	if err != nil {
		return 0, 0, nil, err
	}
	return count, totalAmount, categoryNames, nil
}

func (u *dailyBillUseCase) GenerateDailyBillsForRoute(ctx context.Context, routeID uuid.UUID, periodID uuid.UUID) (int, float64, []string, error) {
	// 1. Fetch route to get its daily fee
	routes, err := u.logisticsRepo.GetRoutes(ctx)
	if err != nil {
		return 0, 0, nil, err
	}
	var selectedRoute *domain.TransportRoute
	for _, r := range routes {
		if r.ID == routeID {
			selectedRoute = &r
			break
		}
	}
	if selectedRoute == nil {
		return 0, 0, nil, fmt.Errorf("route not found")
	}

	// 2. Fetch standard DAILY fee structures (e.g. Canteen)
	var standardDailyAmount float64
	var categoryNames []string
	dailyFees, err := u.fiscalRepo.GetFeeStructuresByFrequency(ctx, periodID, domain.FrequencyDaily)
	if err == nil {
		for _, fee := range dailyFees {
			standardDailyAmount += fee.Amount
			categoryNames = append(categoryNames, string(fee.Category))
		}
	}

	totalAmount := selectedRoute.DailyFee + standardDailyAmount
	categoryNames = append(categoryNames, "Transport")

	// 3. Fetch students on the route
	assignments, err := u.logisticsRepo.GetAssignmentsByRoute(ctx, routeID)
	if err != nil {
		return 0, 0, nil, err
	}

	if len(assignments) == 0 {
		return 0, totalAmount, categoryNames, nil
	}

	today := time.Now()
	// Get all existing bills for today to filter out
	existingBills, err := u.billRepo.GetByDate(ctx, today)
	if err != nil {
		return 0, 0, nil, err
	}
	existingMap := make(map[uuid.UUID]bool)
	for _, b := range existingBills {
		existingMap[b.StudentID] = true
	}

	studentMap := make(map[uuid.UUID]*domain.Student)
	allStudents, _ := u.studentRepo.GetAll(ctx)
	for i := range allStudents {
		studentMap[allStudents[i].ID] = &allStudents[i]
	}

	var bills []domain.DailyBill
	for _, a := range assignments {
		if !existingMap[a.StudentID] {
			st := studentMap[a.StudentID]
			if st != nil {
				bills = append(bills, u.processBillWithWallet(ctx, st, totalAmount, today, strings.Join(categoryNames, ", ")))
			} else {
				bills = append(bills, domain.DailyBill{
					StudentID: a.StudentID,
					Amount:    totalAmount,
					Date:      today,
					Status:    domain.DailyBillPending,
				})
			}
		}
	}

	if len(bills) == 0 {
		return 0, totalAmount, categoryNames, nil
	}

	if err := u.billRepo.BulkCreate(ctx, bills); err != nil {
		return 0, 0, nil, err
	}

	return len(bills), totalAmount, categoryNames, nil
}

func (u *dailyBillUseCase) GenerateDailyBillsForWalkIns(ctx context.Context, periodID uuid.UUID) (int, float64, []string, error) {
	var standardDailyAmount float64
	var categoryNames []string
	dailyFees, err := u.fiscalRepo.GetFeeStructuresByFrequency(ctx, periodID, domain.FrequencyDaily)
	if err == nil {
		for _, fee := range dailyFees {
			standardDailyAmount += fee.Amount
			categoryNames = append(categoryNames, string(fee.Category))
		}
	}

	students, err := u.logisticsRepo.GetStudentsWithoutRoute(ctx)
	if err != nil {
		return 0, 0, nil, err
	}

	if len(students) == 0 {
		return 0, standardDailyAmount, categoryNames, nil
	}

	today := time.Now()
	existingBills, err := u.billRepo.GetByDate(ctx, today)
	if err != nil {
		return 0, 0, nil, err
	}
	existingMap := make(map[uuid.UUID]bool)
	for _, b := range existingBills {
		existingMap[b.StudentID] = true
	}

	var bills []domain.DailyBill
	for _, s := range students {
		if !existingMap[s.ID] {
			st := s
			bills = append(bills, u.processBillWithWallet(ctx, &st, standardDailyAmount, today, strings.Join(categoryNames, ", ")))
		}
	}

	if len(bills) == 0 {
		return 0, standardDailyAmount, categoryNames, nil
	}

	if err := u.billRepo.BulkCreate(ctx, bills); err != nil {
		return 0, 0, nil, err
	}

	return len(bills), standardDailyAmount, categoryNames, nil
}

func (u *dailyBillUseCase) GetPendingBillsByRoute(ctx context.Context, routeID uuid.UUID) ([]domain.DailyBill, error) {
	// Fetch all pending bills for today
	today := time.Now()
	pendingBills, err := u.billRepo.GetPendingByDate(ctx, today)
	if err != nil {
		return nil, err
	}

	// Fetch students on the route
	assignments, err := u.logisticsRepo.GetAssignmentsByRoute(ctx, routeID)
	if err != nil {
		return nil, err
	}

	studentMap := make(map[uuid.UUID]bool)
	for _, a := range assignments {
		studentMap[a.StudentID] = true
	}

	var filtered []domain.DailyBill
	for _, b := range pendingBills {
		if studentMap[b.StudentID] {
			filtered = append(filtered, b)
		}
	}
	return filtered, nil
}

func (u *dailyBillUseCase) GetPendingBillsForWalkIns(ctx context.Context) ([]domain.DailyBill, error) {
	today := time.Now()
	pendingBills, err := u.billRepo.GetPendingByDate(ctx, today)
	if err != nil {
		return nil, err
	}

	students, err := u.logisticsRepo.GetStudentsWithoutRoute(ctx)
	if err != nil {
		return nil, err
	}

	studentMap := make(map[uuid.UUID]bool)
	for _, s := range students {
		studentMap[s.ID] = true
	}

	var filtered []domain.DailyBill
	for _, b := range pendingBills {
		if studentMap[b.StudentID] {
			filtered = append(filtered, b)
		}
	}
	return filtered, nil
}

// BatchCollectBills collects multiple daily bills at once in a single batch operation
func (u *dailyBillUseCase) BatchCollectBills(ctx context.Context, billIDs []uuid.UUID, collectorID uuid.UUID) (int64, error) {
	if len(billIDs) == 0 {
		return 0, nil
	}
	count, err := u.billRepo.BatchMarkPaid(ctx, billIDs, collectorID)
	if err == nil && u.feeNotifier != nil {
		for _, bID := range billIDs {
			if bill, bErr := u.billRepo.GetByID(ctx, bID); bErr == nil && bill != nil {
				_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
					StudentID:        bill.StudentID,
					Amount:           bill.Amount,
					Category:         "DAILY_FEE",
					PaymentMethod:    "BATCH_COLLECT",
					ReceiptReference: fmt.Sprintf("BATCH-%s", strings.ToUpper(bill.ID.String()[:8])),
					RemainingBalance: 0,
					Note:             "Daily Bill Batch Collection",
				})
			}
		}
	}
	return count, err
}

// QuickCollectStudent locates today's pending bill for a student by ID or enrollment code,
// auto-deducts from their prepaid wallet if funded, or collects as cash.
func (u *dailyBillUseCase) QuickCollectStudent(ctx context.Context, identifier string, collectorID uuid.UUID) (*domain.DailyBill, error) {
	var student *domain.Student
	var err error

	// 1. Try parsing as UUID first
	if studentID, parseErr := uuid.Parse(identifier); parseErr == nil {
		student, err = u.studentRepo.GetByID(ctx, studentID)
	}

	// 2. If not found by UUID, try by enrollment number / index number
	if student == nil {
		student, err = u.studentRepo.GetByEnrollmentNumber(ctx, identifier)
	}

	if err != nil || student == nil {
		return nil, fmt.Errorf("student not found for identifier '%s'", identifier)
	}

	today := time.Now()
	// Find pending bill for today
	bill, err := u.billRepo.GetTodaysPendingBillByStudentID(ctx, student.ID, today)
	if err != nil || bill == nil {
		// Check if already paid today
		studentBills, _ := u.billRepo.GetByStudent(ctx, student.ID)
		for _, sb := range studentBills {
			if sb.Date.Year() == today.Year() && sb.Date.YearDay() == today.YearDay() && sb.Status == domain.DailyBillPaid {
				return &sb, fmt.Errorf("fee for %s %s is already PAID for today", student.FirstName, student.LastName)
			}
		}
		return nil, fmt.Errorf("no pending daily bill found today for %s %s", student.FirstName, student.LastName)
	}

	// If student has prepaid wallet balance, auto-deduct from wallet
	if student.PrepaidBalance >= bill.Amount && bill.Amount > 0 {
		now := time.Now()
		student.PrepaidBalance -= bill.Amount
		_ = u.studentRepo.Update(ctx, student)
		_ = u.fiscalRepo.CreateWalletTransaction(ctx, &domain.WalletTransaction{
			StudentID:   student.ID,
			Type:        domain.WalletTransactionDebit,
			Amount:      bill.Amount,
			Balance:     student.PrepaidBalance,
			Description: "Daily Fee Quick-Scan Deduction",
		})
		bill.Status = domain.DailyBillPaid
		bill.CollectedAt = &now
		bill.CollectedBy = &collectorID
		_ = u.billRepo.MarkPaid(ctx, bill.ID, collectorID)
	} else {
		// Cash collection
		if err := u.billRepo.MarkPaid(ctx, bill.ID, collectorID); err != nil {
			return nil, fmt.Errorf("failed to record payment: %w", err)
		}
		now := time.Now()
		bill.Status = domain.DailyBillPaid
		bill.CollectedAt = &now
		bill.CollectedBy = &collectorID
	}

	if u.feeNotifier != nil {
		_ = u.feeNotifier.NotifyPayment(ctx, FeePaymentNotification{
			StudentID:        student.ID,
			Amount:           bill.Amount,
			Category:         "DAILY_FEE",
			PaymentMethod:    "SCAN_COLLECT",
			ReceiptReference: fmt.Sprintf("SCAN-%s", strings.ToUpper(bill.ID.String()[:8])),
			RemainingBalance: student.PrepaidBalance,
			Note:             fmt.Sprintf("Quick Collection for %s %s", student.FirstName, student.LastName),
		})
	}

	bill.Student = student
	return bill, nil
}

// GetReconciliationSummary aggregates all daily collections for a given date for audit & handover
func (u *dailyBillUseCase) GetReconciliationSummary(ctx context.Context, date time.Time) (*domain.DailyReconciliationSummary, error) {
	bills, err := u.billRepo.GetByDate(ctx, date)
	if err != nil {
		return nil, err
	}

	summary := &domain.DailyReconciliationSummary{
		Date:               date.Format("2006-01-02"),
		TotalBillsCount:    len(bills),
		CollectorSummaries: make([]domain.CollectorReconciliation, 0),
	}

	collectorMap := make(map[uuid.UUID]*domain.CollectorReconciliation)

	for _, b := range bills {
		summary.TotalBilledAmount += b.Amount

		switch b.Status {
		case domain.DailyBillPaid:
			summary.PaidBillsCount++
			if b.CollectedBy != nil && *b.CollectedBy != uuid.Nil {
				summary.TotalCashCollected += b.Amount
				cID := *b.CollectedBy
				if item, exists := collectorMap[cID]; exists {
					item.CountCollected++
					item.TotalCash += b.Amount
				} else {
					collectorMap[cID] = &domain.CollectorReconciliation{
						CollectorID:    cID,
						CollectorName:  "Collector " + cID.String()[:8],
						CountCollected: 1,
						TotalCash:      b.Amount,
					}
				}
			} else {
				summary.TotalWalletDeducted += b.Amount
			}
		case domain.DailyBillPending:
			summary.PendingBillsCount++
			summary.TotalPendingAmount += b.Amount
		case domain.DailyBillOverdue:
			summary.OverdueBillsCount++
			summary.TotalPendingAmount += b.Amount
		}
	}

	for _, cSummary := range collectorMap {
		summary.CollectorSummaries = append(summary.CollectorSummaries, *cSummary)
	}

	return summary, nil
}

// RolloverOverdueBills finds all unpaid daily bills prior to beforeDate and converts them to overdue status
func (u *dailyBillUseCase) RolloverOverdueBills(ctx context.Context, beforeDate time.Time) (int64, float64, error) {
	overdueBills, err := u.billRepo.GetOverdueBills(ctx, beforeDate)
	if err != nil {
		return 0, 0, err
	}

	var totalAmount float64
	for _, b := range overdueBills {
		totalAmount += b.Amount
	}

	count, err := u.billRepo.MarkOverdue(ctx, beforeDate)
	return count, totalAmount, err
}

// SubmitHandover registers a shift handover submission by a faculty collector
func (u *dailyBillUseCase) SubmitHandover(ctx context.Context, collectorID uuid.UUID, expectedCash, actualCash float64, denomsJSON, notes string) (*domain.DailyHandover, error) {
	handover := &domain.DailyHandover{
		Date:              time.Now(),
		CollectorID:       collectorID,
		ExpectedCash:      expectedCash,
		ActualCash:        actualCash,
		Variance:          actualCash - expectedCash,
		DenominationsJSON: denomsJSON,
		Notes:             notes,
		Status:            domain.HandoverStatusPending,
	}

	if err := u.billRepo.CreateHandover(ctx, handover); err != nil {
		return nil, fmt.Errorf("failed to record shift handover: %w", err)
	}

	return handover, nil
}

// VerifyHandover processes the Bursar/Accountant verification and countersignature of a shift handover
func (u *dailyBillUseCase) VerifyHandover(ctx context.Context, handoverID uuid.UUID, bursarID uuid.UUID, status domain.DailyHandoverStatus, notes string) (*domain.DailyHandover, error) {
	handover, err := u.billRepo.GetHandoverByID(ctx, handoverID)
	if err != nil {
		return nil, fmt.Errorf("handover record not found: %w", err)
	}

	now := time.Now()
	handover.BursarID = &bursarID
	handover.Status = status
	handover.VerifiedAt = &now
	if notes != "" {
		if handover.Notes != "" {
			handover.Notes += "\n[Bursar Verification Note]: " + notes
		} else {
			handover.Notes = "[Bursar Verification Note]: " + notes
		}
	}

	if err := u.billRepo.UpdateHandover(ctx, handover); err != nil {
		return nil, fmt.Errorf("failed to update handover record: %w", err)
	}

	return handover, nil
}

// GetHandovers fetches all shift handover records for a specific date
func (u *dailyBillUseCase) GetHandovers(ctx context.Context, date time.Time) ([]domain.DailyHandover, error) {
	return u.billRepo.GetHandoversByDate(ctx, date)
}

// GetDailyFeeAnalytics computes route-by-route performance, payment distribution, and hourly collection velocity
func (u *dailyBillUseCase) GetDailyFeeAnalytics(ctx context.Context, date time.Time) (*domain.DailyFeeAnalytics, error) {
	bills, err := u.billRepo.GetByDate(ctx, date)
	if err != nil {
		return nil, err
	}

	analytics := &domain.DailyFeeAnalytics{
		Date:              date.Format("2006-01-02"),
		RoutePerformances: make([]domain.RouteFeePerformance, 0),
		HourlyVelocity:    make(map[string]float64),
	}

	for _, b := range bills {
		analytics.TotalBilled += b.Amount

		if b.Status == domain.DailyBillPaid {
			analytics.TotalCollected += b.Amount
			if b.CollectedBy != nil && *b.CollectedBy != uuid.Nil {
				analytics.TotalCash += b.Amount
			} else {
				analytics.TotalWallet += b.Amount
			}

			if b.CollectedAt != nil {
				hourKey := b.CollectedAt.Format("15:00")
				analytics.HourlyVelocity[hourKey] += b.Amount
			}
		} else {
			analytics.TotalPending += b.Amount
		}
	}

	if analytics.TotalBilled > 0 {
		analytics.OverallClearance = (analytics.TotalCollected / analytics.TotalBilled) * 100.0
	}

	// Calculate per-route performance
	routes, _ := u.logisticsRepo.GetRoutes(ctx)
	for _, route := range routes {
		assignments, _ := u.logisticsRepo.GetAssignmentsByRoute(ctx, route.ID)
		studentIDs := make(map[uuid.UUID]bool)
		for _, a := range assignments {
			studentIDs[a.StudentID] = true
		}

		perf := domain.RouteFeePerformance{
			RouteID:          route.ID,
			RouteName:        route.Name,
			DailyRate:        route.DailyFee,
			AssignedStudents: len(assignments),
		}

		for _, b := range bills {
			if studentIDs[b.StudentID] {
				perf.BilledCount++
				perf.TotalBilled += b.Amount
				if b.Status == domain.DailyBillPaid {
					perf.PaidCount++
					perf.TotalCollected += b.Amount
				} else {
					perf.PendingCount++
				}
			}
		}

		if perf.TotalBilled > 0 {
			perf.ClearanceRate = (perf.TotalCollected / perf.TotalBilled) * 100.0
		}

		analytics.RoutePerformances = append(analytics.RoutePerformances, perf)
	}

	return analytics, nil
}


