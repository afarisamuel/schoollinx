package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type dailyBillUseCase struct {
	billRepo      domain.DailyBillRepository
	studentRepo   domain.StudentRepository
	fiscalRepo    domain.FiscalRepository
	logisticsRepo domain.LogisticsRepository
}

func NewDailyBillUseCase(billRepo domain.DailyBillRepository, studentRepo domain.StudentRepository, fiscalRepo domain.FiscalRepository, logisticsRepo domain.LogisticsRepository) domain.DailyBillUseCase {
	return &dailyBillUseCase{
		billRepo:      billRepo,
		studentRepo:   studentRepo,
		fiscalRepo:    fiscalRepo,
		logisticsRepo: logisticsRepo,
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
		bills = append(bills, domain.DailyBill{
			StudentID: s.ID,
			Amount:    amount,
			Date:      today,
			Status:    domain.DailyBillPending,
		})
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
	return u.billRepo.MarkPaid(ctx, billID, collectorID)
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

	var bills []domain.DailyBill
	for _, a := range assignments {
		if !existingMap[a.StudentID] {
			bills = append(bills, domain.DailyBill{
				StudentID: a.StudentID,
				Amount:    totalAmount,
				Date:      today,
				Status:    domain.DailyBillPending,
			})
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
			bills = append(bills, domain.DailyBill{
				StudentID: s.ID,
				Amount:    standardDailyAmount,
				Date:      today,
				Status:    domain.DailyBillPending,
			})
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
