package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type fiscalRepository struct {
	db *gorm.DB
}

func NewFiscalRepository(db *gorm.DB) domain.FiscalRepository {
	return &fiscalRepository{db: db}
}

func (r *fiscalRepository) Create(ctx context.Context, record *domain.FiscalRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

func (r *fiscalRepository) Transaction(ctx context.Context, fn func(repo domain.FiscalRepository) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := &fiscalRepository{db: tx}
		return fn(txRepo)
	})
}

func (r *fiscalRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.FiscalRecord, error) {
	var record domain.FiscalRecord
	if err := r.db.WithContext(ctx).
		Preload("Student").
		Preload("Student.Class").
		First(&record, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &record, nil
}


func (r *fiscalRepository) MarkOverdueRecords(ctx context.Context, asOf time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.FiscalRecord{}).
		Where("status = ? AND due_date < ?", domain.PaymentStatusPending, asOf).
		Update("status", domain.PaymentStatusOverdue).Error
}

func (r *fiscalRepository) GetFiscalSummaryStats(ctx context.Context, currentMonth, currentYear int) (*domain.FiscalSummary, error) {
	summary := &domain.FiscalSummary{}

	// Aggregation query for Receivables and Overdue
	var stats struct {
		TotalReceivables float64
		TotalOverdue     float64
	}
	err := r.db.WithContext(ctx).Model(&domain.FiscalRecord{}).Select(`
		COALESCE(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN GREATEST(amount - COALESCE(amount_paid, 0), 0) ELSE 0 END), 0) as total_receivables,
		COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN GREATEST(amount - COALESCE(amount_paid, 0), 0) ELSE 0 END), 0) as total_overdue
	`).Scan(&stats).Error
	if err != nil {
		return nil, err
	}
	summary.TotalReceivables = stats.TotalReceivables
	summary.TotalOverdue = stats.TotalOverdue

	// Aggregation query for CollectionsMTD
	var mtd struct {
		CollectionsMTD float64
	}
	err = r.db.WithContext(ctx).Model(&domain.FiscalRecord{}).
		Where("EXTRACT(MONTH FROM updated_at) = ? AND EXTRACT(YEAR FROM updated_at) = ?", currentMonth, currentYear).
		Select("COALESCE(SUM(COALESCE(amount_paid, 0)), 0) as collections_mtd").
		Scan(&mtd).Error
	if err != nil {
		return nil, err
	}
	summary.CollectionsMTD = mtd.CollectionsMTD

	return summary, nil
}

func (r *fiscalRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.FiscalRecord, error) {
	var records []domain.FiscalRecord
	err := r.db.WithContext(ctx).
		Where("student_id = ?", studentID).
		Select("*, GREATEST(amount - COALESCE(amount_paid, 0), 0) AS balance_due").
		Find(&records).Error
	return records, err
}

func (r *fiscalRepository) GetAll(ctx context.Context) ([]domain.FiscalRecord, error) {
	var records []domain.FiscalRecord
	err := r.db.WithContext(ctx).
		Preload("Student").
		Preload("Student.Class").
		Select("*, GREATEST(amount - COALESCE(amount_paid, 0), 0) AS balance_due").
		Find(&records).Error
	return records, err
}

func (r *fiscalRepository) Update(ctx context.Context, record *domain.FiscalRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

func (r *fiscalRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.FiscalRecord{}, "id = ?", id).Error
}

func (r *fiscalRepository) SaveFeeStructure(ctx context.Context, structure *domain.FeeStructure) error {
	if structure.ID != uuid.Nil {
		var existing domain.FeeStructure
		err := r.db.WithContext(ctx).Where("id = ?", structure.ID).First(&existing).Error
		if err == nil {
			return r.db.WithContext(ctx).Save(structure).Error
		}
	}
	return r.db.WithContext(ctx).Create(structure).Error
}

func (r *fiscalRepository) DeleteFeeStructure(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.FeeStructure{}, "id = ?", id).Error
}

func (r *fiscalRepository) GetFeeStructuresByPeriod(ctx context.Context, periodID uuid.UUID) ([]domain.FeeStructure, error) {
	var structures []domain.FeeStructure
	err := r.db.WithContext(ctx).Where("academic_period_id = ?", periodID).Preload("AcademicPeriod").Find(&structures).Error
	return structures, err
}

func (r *fiscalRepository) GetPendingByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.FiscalRecord, error) {
	var records []domain.FiscalRecord
	err := r.db.WithContext(ctx).Where("student_id = ? AND status IN ?", studentID, []string{string(domain.PaymentStatusPending), string(domain.PaymentStatusOverdue)}).Order("created_at ASC").Find(&records).Error
	return records, err
}

func (r *fiscalRepository) GetFeeStructuresByFrequency(ctx context.Context, periodID uuid.UUID, frequency domain.FeeFrequency) ([]domain.FeeStructure, error) {
	var structures []domain.FeeStructure
	err := r.db.WithContext(ctx).Where("academic_period_id = ? AND frequency = ?", periodID, frequency).Find(&structures).Error
	return structures, err
}

func (r *fiscalRepository) CreateWalletTransaction(ctx context.Context, tx *domain.WalletTransaction) error {
	return r.db.WithContext(ctx).Create(tx).Error
}

func (r *fiscalRepository) GetWalletTransactions(ctx context.Context, studentID uuid.UUID) ([]domain.WalletTransaction, error) {
	var txns []domain.WalletTransaction
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Order("created_at DESC").Find(&txns).Error
	return txns, err
}

// Donation Repository Implementation

type donationRepository struct {
	db *gorm.DB
}

func NewDonationRepository(db *gorm.DB) domain.DonationRepository {
	return &donationRepository{db: db}
}

func (r *donationRepository) Create(ctx context.Context, donation *domain.Donation) error {
	return r.db.WithContext(ctx).Create(donation).Error
}

func (r *donationRepository) GetByDonor(ctx context.Context, donorID uuid.UUID) ([]domain.Donation, error) {
	var donations []domain.Donation
	err := r.db.WithContext(ctx).Where("donor_id = ?", donorID).Find(&donations).Error
	return donations, err
}

func (r *donationRepository) GetTotalDonations(ctx context.Context) (float64, error) {
	var total float64
	err := r.db.WithContext(ctx).Model(&domain.Donation{}).Where("payment_status = ?", "COMPLETED").Select("COALESCE(SUM(amount), 0)").Scan(&total).Error
	return total, err
}

func (r *donationRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).Model(&domain.Donation{}).Where("id = ?", id).Update("payment_status", status).Error
}

// Budget & Expenses

func (r *fiscalRepository) CreateBudget(ctx context.Context, budget *domain.Budget) error {
	return r.db.WithContext(ctx).Create(budget).Error
}

func (r *fiscalRepository) UpdateBudgetSpent(ctx context.Context, budgetID uuid.UUID, amount float64) error {
	return r.db.WithContext(ctx).Model(&domain.Budget{}).Where("id = ?", budgetID).UpdateColumn("spent_amount", gorm.Expr("spent_amount + ?", amount)).Error
}

func (r *fiscalRepository) GetBudgets(ctx context.Context, academicYear string) ([]domain.Budget, error) {
	var budgets []domain.Budget
	err := r.db.WithContext(ctx).Where("academic_year = ?", academicYear).Find(&budgets).Error
	return budgets, err
}

func (r *fiscalRepository) CreateExpenditure(ctx context.Context, exp *domain.Expenditure) error {
	return r.db.WithContext(ctx).Create(exp).Error
}

func (r *fiscalRepository) CreateExpenseClaim(ctx context.Context, claim *domain.ExpenseClaim) error {
	return r.db.WithContext(ctx).Create(claim).Error
}

func (r *fiscalRepository) UpdateExpenseClaimStatus(ctx context.Context, claimID uuid.UUID, status string, reviewerID uuid.UUID) error {
	updates := map[string]interface{}{"status": status}
	if status == "PENDING_FINANCE" || status == "REJECTED" && reviewerID != uuid.Nil {
		updates["manager_id"] = reviewerID
	} else if status == "APPROVED" || status == "PAID" {
		updates["finance_id"] = reviewerID
	}
	return r.db.WithContext(ctx).Model(&domain.ExpenseClaim{}).Where("id = ?", claimID).Updates(updates).Error
}

func (r *fiscalRepository) GetExpenseClaims(ctx context.Context, status string) ([]domain.ExpenseClaim, error) {
	var claims []domain.ExpenseClaim
	q := r.db.WithContext(ctx)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("created_at DESC").Find(&claims).Error
	return claims, err
}

func (r *fiscalRepository) GetExpenseClaimByID(ctx context.Context, claimID uuid.UUID) (*domain.ExpenseClaim, error) {
	var claim domain.ExpenseClaim
	if err := r.db.WithContext(ctx).First(&claim, "id = ?", claimID).Error; err != nil {
		return nil, err
	}
	return &claim, nil
}

func (r *fiscalRepository) GetDefaultersOlderThan(ctx context.Context, days int) ([]domain.FiscalRecord, error) {
	var records []domain.FiscalRecord
	cutoff := time.Now().AddDate(0, 0, -days)
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("status IN ? AND due_date < ?", []string{"PENDING", "OVERDUE"}, cutoff).
		Order("due_date ASC").
		Find(&records).Error
	return records, err
}

func (r *fiscalRepository) CreateScholarship(ctx context.Context, scholarship *domain.Scholarship) error {
	return r.db.WithContext(ctx).Create(scholarship).Error
}

func (r *fiscalRepository) GetScholarshipByID(ctx context.Context, id uuid.UUID) (*domain.Scholarship, error) {
	var s domain.Scholarship
	err := r.db.WithContext(ctx).Preload("Student").First(&s, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *fiscalRepository) GetScholarshipsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.Scholarship, error) {
	var s []domain.Scholarship
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&s).Error
	return s, err
}

func (r *fiscalRepository) GetActiveScholarships(ctx context.Context) ([]domain.Scholarship, error) {
	var s []domain.Scholarship
	err := r.db.WithContext(ctx).Where("status = ?", domain.ScholarshipStatusActive).Preload("Student").Find(&s).Error
	return s, err
}

func (r *fiscalRepository) UpdateScholarship(ctx context.Context, scholarship *domain.Scholarship) error {
	return r.db.WithContext(ctx).Save(scholarship).Error
}

// Installment Agreements
func (r *fiscalRepository) CreateInstallmentAgreement(ctx context.Context, agreement *domain.InstallmentAgreement) error {
	if agreement.ID == uuid.Nil {
		agreement.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(agreement).Error
}

func (r *fiscalRepository) GetInstallmentAgreementsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.InstallmentAgreement, error) {
	var agreements []domain.InstallmentAgreement
	err := r.db.WithContext(ctx).Preload("Milestones").
		Where("student_id = ?", studentID).
		Order("created_at DESC").Find(&agreements).Error
	return agreements, err
}

func (r *fiscalRepository) GetInstallmentAgreementByID(ctx context.Context, id uuid.UUID) (*domain.InstallmentAgreement, error) {
	var agreement domain.InstallmentAgreement
	err := r.db.WithContext(ctx).Preload("Milestones").First(&agreement, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &agreement, nil
}

func (r *fiscalRepository) GetInstallmentMilestoneByID(ctx context.Context, id uuid.UUID) (*domain.InstallmentMilestone, error) {
	var m domain.InstallmentMilestone
	err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *fiscalRepository) UpdateInstallmentMilestone(ctx context.Context, id uuid.UUID, amountPaid float64, status string) error {
	updates := map[string]interface{}{
		"amount_paid": amountPaid,
		"status":      status,
	}
	if status == "PAID" {
		now := time.Now()
		updates["paid_at"] = &now
	}
	return r.db.WithContext(ctx).Model(&domain.InstallmentMilestone{}).Where("id = ?", id).Updates(updates).Error
}

func (r *fiscalRepository) GetInstallmentPlanTemplate(ctx context.Context) (*domain.InstallmentPlanTemplate, error) {
	var template domain.InstallmentPlanTemplate
	err := r.db.WithContext(ctx).Order("updated_at DESC").First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &template, nil
}

func (r *fiscalRepository) SaveInstallmentPlanTemplate(ctx context.Context, template *domain.InstallmentPlanTemplate) error {
	var existing domain.InstallmentPlanTemplate
	err := r.db.WithContext(ctx).First(&existing).Error
	if err == nil {
		template.ID = existing.ID
		return r.db.WithContext(ctx).Save(template).Error
	}
	if template.ID == uuid.Nil {
		template.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(template).Error
}

func (r *fiscalRepository) GetBillTemplateConfig(ctx context.Context) (*domain.BillTemplateConfig, error) {
	var config domain.BillTemplateConfig
	err := r.db.WithContext(ctx).Order("updated_at DESC").First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return intelligent default template config
			defaultCfg := &domain.BillTemplateConfig{
				Title:             "PUPIL BILL FOR TERM",
				Subtitle:          "Official School Billing & Academic Expense Statement",
				FooterNotes:       "Toiletries, stationery, and books must be presented on the first day of resumption.\n\nAll fee payments must be made using your child's student ID via official school payment channels.\n\nSTRICTLY NO PHYSICAL CASH PAYMENT TO SCHOOL STAFF.\n\nPayment can be made in advance to enhance flexible installments.",
				ShowSuppliesTable: true,
				SuppliesTitle:     "REQUIRED BOOKS & MATERIALS TO BE BROUGHT / PURCHASED",
				RequiredItems: []domain.BillSupplyItem{
					{Category: "BOOKS", Description: "Core Mathematics Course Book", Quantity: "1 copy", Note: "Compulsory for all terms"},
					{Category: "BOOKS", Description: "English Language & Grammar Workbook", Quantity: "1 copy", Note: "Compulsory"},
					{Category: "STATIONERY", Description: "Ruled Exercise Books (Pack of 10)", Quantity: "1 pack", Note: "Available at school store"},
					{Category: "TOILETRIES", Description: "Antiseptic Liquid / Disinfectant (250ml)", Quantity: "2 bottles", Note: "To be handed to Housemaster"},
					{Category: "TOILETRIES", Description: "Washing Powder (1kg)", Quantity: "1 pack", Note: "Term requirement"},
					{Category: "TOILETRIES", Description: "Toilet Paper Rolls", Quantity: "3 rolls", Note: "Standard pack"},
				},
			}
			return defaultCfg, nil
		}
		return nil, err
	}
	return &config, nil
}

func (r *fiscalRepository) SaveBillTemplateConfig(ctx context.Context, config *domain.BillTemplateConfig) error {
	var existing domain.BillTemplateConfig
	err := r.db.WithContext(ctx).First(&existing).Error
	if err == nil {
		config.ID = existing.ID
		return r.db.WithContext(ctx).Save(config).Error
	}
	if config.ID == uuid.Nil {
		config.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(config).Error
}



