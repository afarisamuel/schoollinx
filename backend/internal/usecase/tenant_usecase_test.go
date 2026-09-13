package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type mockSubscriptionTenantRepo struct {
	tenant *domain.Tenant
}

func (m *mockSubscriptionTenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error {
	m.tenant = tenant
	return nil
}
func (m *mockSubscriptionTenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return m.tenant, nil
}
func (m *mockSubscriptionTenantRepo) GetBySubdomain(ctx context.Context, subdomain string) (*domain.Tenant, error) {
	return m.tenant, nil
}
func (m *mockSubscriptionTenantRepo) GetAll(ctx context.Context) ([]domain.Tenant, error) {
	return []domain.Tenant{*m.tenant}, nil
}
func (m *mockSubscriptionTenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error {
	m.tenant = tenant
	return nil
}
func (m *mockSubscriptionTenantRepo) GetBySetupToken(ctx context.Context, token string) (*domain.Tenant, error) {
	return m.tenant, nil
}
func (m *mockSubscriptionTenantRepo) UpdateStatus(ctx context.Context, id uuid.UUID, isActive bool) error {
	return nil
}
func (m *mockSubscriptionTenantRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	assert.NoError(t, err)

	db.Exec(`CREATE TABLE IF NOT EXISTS tenant_subscription_payments (
		id TEXT PRIMARY KEY,
		tenant_id TEXT NOT NULL,
		amount REAL NOT NULL,
		student_count INTEGER NOT NULL,
		reference TEXT UNIQUE NOT NULL,
		status TEXT NOT NULL,
		provider TEXT,
		payer_email TEXT,
		created_at DATETIME,
		updated_at DATETIME
	);`)

	db.Exec(`ATTACH DATABASE ':memory:' AS test;`)
	db.Exec(`CREATE TABLE IF NOT EXISTS test.students (id TEXT PRIMARY KEY, status TEXT, deleted_at DATETIME);`)
	return db
}

func TestTenantSubscriptionSummary_DeltaCalculations(t *testing.T) {
	db := setupTestDB(t)

	tenantID := uuid.New()
	futureDue := time.Now().AddDate(0, 3, 0)
	pastDue := time.Now().AddDate(0, -1, 0)

	tenant := &domain.Tenant{
		ID:                    tenantID,
		Name:                  "Test Academy",
		Subdomain:             "test",
		SchemaName:            "test",
		PerStudentPerTermRate: 5.0,
		BillingDueDate:        &futureDue,
	}

	repo := &mockSubscriptionTenantRepo{tenant: tenant}
	uc := usecase.NewTenantUseCase(repo, db, nil, nil)

	// 1. Initial State: 4 students in DB, 4 students paid
	db.Exec(`DELETE FROM test.students;`)
	for i := 0; i < 4; i++ {
		db.Exec(`INSERT INTO test.students (id, status) VALUES (?, 'Active');`, uuid.New().String())
	}

	// Insert payment of 4 students
	db.Create(&domain.TenantSubscriptionPayment{
		ID:           uuid.New(),
		TenantID:     tenantID,
		Amount:       20.0,
		StudentCount: 4,
		Reference:    "SUB-TEST-1",
		Status:       "SUCCESS",
		CreatedAt:    time.Now().AddDate(0, -1, 0),
	})

	// Test 1: Fully Paid State
	summary, err := uc.GetSubscriptionSummary(context.Background(), tenantID.String())
	assert.NoError(t, err)
	assert.Equal(t, 4, summary.TotalStudents)
	assert.Equal(t, 4, summary.PaidStudentCount)
	assert.Equal(t, 0, summary.UnpaidStudentCount)
	assert.Equal(t, 0.0, summary.TotalDue)
	assert.True(t, summary.IsFullyCovered)
	assert.Equal(t, "ACTIVE", summary.Status)

	// Test 2: Add 200 newly enrolled students (Total = 204)
	for i := 0; i < 200; i++ {
		db.Exec(`INSERT INTO test.students (id, status) VALUES (?, 'Active');`, uuid.New().String())
	}

	summaryDelta, err := uc.GetSubscriptionSummary(context.Background(), tenantID.String())
	assert.NoError(t, err)
	assert.Equal(t, 204, summaryDelta.TotalStudents)
	assert.Equal(t, 4, summaryDelta.PaidStudentCount)
	assert.Equal(t, 200, summaryDelta.UnpaidStudentCount)
	assert.Equal(t, 1000.0, summaryDelta.TotalDue) // 200 * 5.0 = 1000
	assert.False(t, summaryDelta.IsFullyCovered)
	assert.Equal(t, "PARTIAL", summaryDelta.Status)

	// Test 3: Pay the 200 delta students
	db.Create(&domain.TenantSubscriptionPayment{
		ID:           uuid.New(),
		TenantID:     tenantID,
		Amount:       1000.0,
		StudentCount: 200,
		Reference:    "SUB-TEST-2",
		Status:       "SUCCESS",
		CreatedAt:    time.Now(),
	})

	summaryAfterTopUp, err := uc.GetSubscriptionSummary(context.Background(), tenantID.String())
	assert.NoError(t, err)
	assert.Equal(t, 204, summaryAfterTopUp.TotalStudents)
	assert.Equal(t, 204, summaryAfterTopUp.PaidStudentCount)
	assert.Equal(t, 0, summaryAfterTopUp.UnpaidStudentCount)
	assert.Equal(t, 0.0, summaryAfterTopUp.TotalDue)
	assert.True(t, summaryAfterTopUp.IsFullyCovered)
	assert.Equal(t, "ACTIVE", summaryAfterTopUp.Status)

	// Test 4: Expired Term
	tenant.BillingDueDate = &pastDue
	summaryExpired, err := uc.GetSubscriptionSummary(context.Background(), tenantID.String())
	assert.NoError(t, err)
	assert.Equal(t, 204, summaryExpired.TotalStudents)
	assert.Equal(t, 0, summaryExpired.PaidStudentCount)
	assert.Equal(t, 204, summaryExpired.UnpaidStudentCount)
	assert.Equal(t, 1020.0, summaryExpired.TotalDue) // 204 * 5.0
	assert.False(t, summaryExpired.IsFullyCovered)
	assert.Equal(t, "OVERDUE", summaryExpired.Status)
}
