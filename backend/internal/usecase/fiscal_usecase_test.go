package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

// --- Mock: FiscalRepository ---
type mockFiscalRepo struct{ mock.Mock }

func (m *mockFiscalRepo) Create(ctx context.Context, r *domain.FiscalRecord) error {
	return m.Called(ctx, r).Error(0)
}
func (m *mockFiscalRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.FiscalRecord, error) {
	args := m.Called(ctx, id); return args.Get(0).(*domain.FiscalRecord), args.Error(1)
}
func (m *mockFiscalRepo) GetByStudent(ctx context.Context, id uuid.UUID) ([]domain.FiscalRecord, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.FiscalRecord), args.Error(1)
}
func (m *mockFiscalRepo) GetAll(ctx context.Context) ([]domain.FiscalRecord, error) {
	args := m.Called(ctx); return args.Get(0).([]domain.FiscalRecord), args.Error(1)
}
func (m *mockFiscalRepo) Update(ctx context.Context, r *domain.FiscalRecord) error {
	return m.Called(ctx, r).Error(0)
}
func (m *mockFiscalRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *mockFiscalRepo) GetPendingByStudent(ctx context.Context, id uuid.UUID) ([]domain.FiscalRecord, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.FiscalRecord), args.Error(1)
}
func (m *mockFiscalRepo) SaveFeeStructure(ctx context.Context, s *domain.FeeStructure) error {
	return m.Called(ctx, s).Error(0)
}
func (m *mockFiscalRepo) GetFeeStructuresByPeriod(ctx context.Context, id uuid.UUID) ([]domain.FeeStructure, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.FeeStructure), args.Error(1)
}
func (m *mockFiscalRepo) GetFeeStructuresByFrequency(ctx context.Context, id uuid.UUID, f domain.FeeFrequency) ([]domain.FeeStructure, error) {
	args := m.Called(ctx, id, f); return args.Get(0).([]domain.FeeStructure), args.Error(1)
}
func (m *mockFiscalRepo) DeleteFeeStructure(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *mockFiscalRepo) CreateWalletTransaction(ctx context.Context, tx *domain.WalletTransaction) error {
	return m.Called(ctx, tx).Error(0)
}
func (m *mockFiscalRepo) GetWalletTransactions(ctx context.Context, id uuid.UUID) ([]domain.WalletTransaction, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.WalletTransaction), args.Error(1)
}
func (m *mockFiscalRepo) CreateBudget(ctx context.Context, b *domain.Budget) error {
	return m.Called(ctx, b).Error(0)
}
func (m *mockFiscalRepo) UpdateBudgetSpent(ctx context.Context, id uuid.UUID, amount float64) error {
	return m.Called(ctx, id, amount).Error(0)
}
func (m *mockFiscalRepo) GetBudgets(ctx context.Context, year string) ([]domain.Budget, error) {
	args := m.Called(ctx, year); return args.Get(0).([]domain.Budget), args.Error(1)
}
func (m *mockFiscalRepo) CreateExpenditure(ctx context.Context, e *domain.Expenditure) error {
	return m.Called(ctx, e).Error(0)
}
func (m *mockFiscalRepo) CreateExpenseClaim(ctx context.Context, c *domain.ExpenseClaim) error {
	return m.Called(ctx, c).Error(0)
}
func (m *mockFiscalRepo) UpdateExpenseClaimStatus(ctx context.Context, id uuid.UUID, status string, reviewer uuid.UUID) error {
	return m.Called(ctx, id, status, reviewer).Error(0)
}
func (m *mockFiscalRepo) GetExpenseClaims(ctx context.Context, status string) ([]domain.ExpenseClaim, error) {
	args := m.Called(ctx, status); return args.Get(0).([]domain.ExpenseClaim), args.Error(1)
}
func (m *mockFiscalRepo) GetExpenseClaimByID(ctx context.Context, id uuid.UUID) (*domain.ExpenseClaim, error) {
	args := m.Called(ctx, id); return args.Get(0).(*domain.ExpenseClaim), args.Error(1)
}
func (m *mockFiscalRepo) GetDefaultersOlderThan(ctx context.Context, days int) ([]domain.FiscalRecord, error) {
	args := m.Called(ctx, days); return args.Get(0).([]domain.FiscalRecord), args.Error(1)
}
func (m *mockFiscalRepo) Transaction(ctx context.Context, fn func(repo domain.FiscalRepository) error) error {
	// For testing, just execute the function directly without a real DB transaction
	return fn(m)
}
func (m *mockFiscalRepo) MarkOverdueRecords(ctx context.Context, asOf time.Time) error {
	return m.Called(ctx, asOf).Error(0)
}
func (m *mockFiscalRepo) GetFiscalSummaryStats(ctx context.Context, month, year int) (*domain.FiscalSummary, error) {
	args := m.Called(ctx, month, year); return args.Get(0).(*domain.FiscalSummary), args.Error(1)
}

func (m *mockFiscalRepo) CreateScholarship(ctx context.Context, scholarship *domain.Scholarship) error { return nil }
func (m *mockFiscalRepo) GetScholarshipByID(ctx context.Context, id uuid.UUID) (*domain.Scholarship, error) { return nil, nil }
func (m *mockFiscalRepo) GetScholarshipsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.Scholarship, error) { return nil, nil }
func (m *mockFiscalRepo) GetAllScholarships(ctx context.Context) ([]domain.Scholarship, error) { return nil, nil }
func (m *mockFiscalRepo) GetActiveScholarships(ctx context.Context) ([]domain.Scholarship, error) { return nil, nil }
func (m *mockFiscalRepo) UpdateScholarship(ctx context.Context, scholarship *domain.Scholarship) error { return nil }

func (m *mockFiscalRepo) CreateInstallmentAgreement(ctx context.Context, agreement *domain.InstallmentAgreement) error { return nil }
func (m *mockFiscalRepo) GetInstallmentAgreementsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.InstallmentAgreement, error) { return nil, nil }
func (m *mockFiscalRepo) GetInstallmentAgreementByID(ctx context.Context, id uuid.UUID) (*domain.InstallmentAgreement, error) { return nil, nil }
func (m *mockFiscalRepo) GetInstallmentMilestoneByID(ctx context.Context, id uuid.UUID) (*domain.InstallmentMilestone, error) { return nil, nil }
func (m *mockFiscalRepo) UpdateInstallmentMilestone(ctx context.Context, id uuid.UUID, amountPaid float64, status string) error { return nil }
func (m *mockFiscalRepo) GetInstallmentPlanTemplate(ctx context.Context) (*domain.InstallmentPlanTemplate, error) { return nil, nil }
func (m *mockFiscalRepo) SaveInstallmentPlanTemplate(ctx context.Context, template *domain.InstallmentPlanTemplate) error { return nil }
func (m *mockFiscalRepo) GetBillTemplateConfig(ctx context.Context) (*domain.BillTemplateConfig, error) { return nil, nil }
func (m *mockFiscalRepo) SaveBillTemplateConfig(ctx context.Context, config *domain.BillTemplateConfig) error { return nil }

// --- Mock: StudentRepository ---
type mockStudentRepo struct{ mock.Mock }

func (m *mockStudentRepo) Create(ctx context.Context, s *domain.Student) error              { return nil }
func (m *mockStudentRepo) BulkUpsert(ctx context.Context, students []domain.Student, bs int) error { return nil }
func (m *mockStudentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Student, error) {
	args := m.Called(ctx, id); return args.Get(0).(*domain.Student), args.Error(1)
}
func (m *mockStudentRepo) GetByEnrollmentNumber(ctx context.Context, num string) (*domain.Student, error) { return nil, nil }
func (m *mockStudentRepo) GetAll(ctx context.Context) ([]domain.Student, error) { return nil, nil }
func (m *mockStudentRepo) GetAllPaginated(ctx context.Context, q domain.PaginationQuery) (int64, []domain.Student, error) {
	return 0, nil, nil
}
func (m *mockStudentRepo) GetStudentsForTeacherPaginated(ctx context.Context, userID uuid.UUID, query domain.PaginationQuery) (int64, []domain.Student, error) {
	return 0, nil, nil
}
func (m *mockStudentRepo) Update(ctx context.Context, s *domain.Student) error {
	return m.Called(ctx, s).Error(0)
}
func (m *mockStudentRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockStudentRepo) GetByClass(ctx context.Context, id uuid.UUID) ([]domain.Student, error) {
	return nil, nil
}
func (m *mockStudentRepo) BatchUpdateEnrollment(ctx context.Context, ids []uuid.UUID, classID uuid.UUID) error {
	return nil
}
func (m *mockStudentRepo) BulkPromote(ctx context.Context, ids []uuid.UUID, year string) error {
	return nil
}
func (m *mockStudentRepo) SaveAlumniProfile(ctx context.Context, p *domain.AlumniProfile) error {
	return nil
}
func (m *mockStudentRepo) GetAlumniProfile(ctx context.Context, id uuid.UUID) (*domain.AlumniProfile, error) {
	return nil, nil
}
func (m *mockStudentRepo) GetAlumni(ctx context.Context) ([]domain.Student, error) { return nil, nil }
func (m *mockStudentRepo) AppendGuardian(ctx context.Context, id uuid.UUID, g *domain.Guardian) error {
	return nil
}

// --- Mock: DonationRepository ---
type mockDonationRepo struct{ mock.Mock }

func (m *mockDonationRepo) Create(ctx context.Context, d *domain.Donation) error { return nil }
func (m *mockDonationRepo) GetByDonor(ctx context.Context, id uuid.UUID) ([]domain.Donation, error) {
	return nil, nil
}
func (m *mockDonationRepo) GetTotalDonations(ctx context.Context) (float64, error) { return 0, nil }
func (m *mockDonationRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return nil
}

// --- Mock: AcademicPeriodRepository ---
type mockAcademicRepo struct{ mock.Mock }

func (m *mockAcademicRepo) Create(ctx context.Context, p *domain.AcademicPeriod) error { return nil }
func (m *mockAcademicRepo) GetAll(ctx context.Context) ([]domain.AcademicPeriod, error) {
	return nil, nil
}
func (m *mockAcademicRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.AcademicPeriod, error) {
	return nil, nil
}
func (m *mockAcademicRepo) GetActive(ctx context.Context) (*domain.AcademicPeriod, error) {
	return nil, nil
}
func (m *mockAcademicRepo) Update(ctx context.Context, p *domain.AcademicPeriod) error  { return nil }
func (m *mockAcademicRepo) Delete(ctx context.Context, id uuid.UUID) error              { return nil }
func (m *mockAcademicRepo) Activate(ctx context.Context, id uuid.UUID) error            { return nil }
func (m *mockAcademicRepo) CreateTerm(ctx context.Context, t *domain.AcademicTerm) error { return nil }
func (m *mockAcademicRepo) GetTermsByPeriod(ctx context.Context, id uuid.UUID) ([]domain.AcademicTerm, error) {
	return nil, nil
}
func (m *mockAcademicRepo) UpdateTerm(ctx context.Context, t *domain.AcademicTerm) error { return nil }
func (m *mockAcademicRepo) DeleteTerm(ctx context.Context, id uuid.UUID) error           { return nil }
func (m *mockAcademicRepo) ActivateTerm(ctx context.Context, periodID, termID uuid.UUID) error {
	return nil
}
func (m *mockAcademicRepo) ToggleTermLock(ctx context.Context, termID uuid.UUID) error { return nil }

// --- Mock: TenantRepository (minimal stub) ---
type mockTenantRepo struct{}

func (m *mockTenantRepo) Create(ctx context.Context, t *domain.Tenant) error { return nil }
func (m *mockTenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepo) GetAll(ctx context.Context) ([]domain.Tenant, error) { return nil, nil }
func (m *mockTenantRepo) GetBySetupToken(ctx context.Context, token string) (*domain.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepo) UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error {
	return nil
}
func (m *mockTenantRepo) Update(ctx context.Context, t *domain.Tenant) error {
	return nil
}

// --- Tests ---

func TestFiscalUseCase_TopUpWallet(t *testing.T) {
	fiscalRepo := new(mockFiscalRepo)
	studentRepo := new(mockStudentRepo)

	uc := usecase.NewFiscalUseCase(fiscalRepo, studentRepo, new(mockDonationRepo), new(mockAcademicRepo), new(mockTenantRepo), nil)

	studentID := uuid.New()
	student := &domain.Student{ID: studentID, PrepaidBalance: 100.0}

	studentRepo.On("GetByID", mock.Anything, studentID).Return(student, nil)
	fiscalRepo.On("GetPendingByStudent", mock.Anything, studentID).Return([]domain.FiscalRecord{}, nil)
	studentRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.Student")).Return(nil)
	fiscalRepo.On("CreateWalletTransaction", mock.Anything, mock.AnythingOfType("*domain.WalletTransaction")).Return(nil)

	err := uc.TopUpWallet(context.Background(), studentID, 50.0, "Test top-up")
	assert.NoError(t, err)
	studentRepo.AssertExpectations(t)
	fiscalRepo.AssertExpectations(t)
}

func TestFiscalUseCase_ListAllRecords(t *testing.T) {
	fiscalRepo := new(mockFiscalRepo)

	uc := usecase.NewFiscalUseCase(fiscalRepo, new(mockStudentRepo), new(mockDonationRepo), new(mockAcademicRepo), new(mockTenantRepo), nil)

	records := []domain.FiscalRecord{
		{ID: uuid.New(), Amount: 200.0},
	}
	fiscalRepo.On("GetAll", mock.Anything).Return(records, nil)

	result, err := uc.ListAllRecords(context.Background())
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	fiscalRepo.AssertExpectations(t)
}

func TestFiscalUseCase_ProcessPayment(t *testing.T) {
	fiscalRepo := new(mockFiscalRepo)
	uc := usecase.NewFiscalUseCase(fiscalRepo, new(mockStudentRepo), new(mockDonationRepo), new(mockAcademicRepo), new(mockTenantRepo), nil)

	recordID := uuid.New()
	record := &domain.FiscalRecord{ID: recordID, Amount: 150.0, AmountPaid: 0, Status: domain.PaymentStatusPending}

	fiscalRepo.On("GetByID", mock.Anything, recordID).Return(record, nil)
	fiscalRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.FiscalRecord")).Return(nil)

	err := uc.ProcessPayment(context.Background(), recordID)
	assert.NoError(t, err)
	assert.Equal(t, domain.PaymentStatusPaid, record.Status)
	assert.Equal(t, 150.0, record.AmountPaid)
	fiscalRepo.AssertExpectations(t)
}

func TestFiscalUseCase_ProcessPartialPayment(t *testing.T) {
	fiscalRepo := new(mockFiscalRepo)
	uc := usecase.NewFiscalUseCase(fiscalRepo, new(mockStudentRepo), new(mockDonationRepo), new(mockAcademicRepo), new(mockTenantRepo), nil)

	recordID := uuid.New()
	record := &domain.FiscalRecord{ID: recordID, Amount: 200.0, AmountPaid: 50.0, Status: domain.PaymentStatusPending}

	fiscalRepo.On("GetByID", mock.Anything, recordID).Return(record, nil)
	fiscalRepo.On("CreateWalletTransaction", mock.Anything, mock.AnythingOfType("*domain.WalletTransaction")).Return(nil)
	fiscalRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.FiscalRecord")).Return(nil)

	err := uc.ProcessPartialPayment(context.Background(), recordID, 100.0, "Test partial")
	assert.NoError(t, err)
	assert.Equal(t, domain.PaymentStatusPending, record.Status)
	assert.Equal(t, 150.0, record.AmountPaid)
	fiscalRepo.AssertExpectations(t)
}
