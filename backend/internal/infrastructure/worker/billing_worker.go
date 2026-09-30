package worker

import (
	"context"
	"time"

	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// DailyBillingWorker automatically executes recurring daily charges (e.g. cafeteria feeding, transit)
// on active school days for enrolled students across all active tenants.
type DailyBillingWorker struct {
	db             *gorm.DB
	locker         Locker
	academicPeriod domain.AcademicPeriodRepository
	dailyBillUC    domain.DailyBillUseCase
	interval       time.Duration
}

func NewDailyBillingWorker(
	db *gorm.DB,
	locker Locker,
	academicPeriod domain.AcademicPeriodRepository,
	dailyBillUC domain.DailyBillUseCase,
	interval time.Duration,
) *DailyBillingWorker {
	if interval <= 0 {
		interval = 6 * time.Hour
	}
	return &DailyBillingWorker{
		db:             db,
		locker:         locker,
		academicPeriod: academicPeriod,
		dailyBillUC:    dailyBillUC,
		interval:       interval,
	}
}

func (w *DailyBillingWorker) Name() string {
	return "DailyBillingWorker"
}

func (w *DailyBillingWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runBilling(ctx)
		}
	}
}

func (w *DailyBillingWorker) runBilling(ctx context.Context) {
	now := time.Now()
	// Run only on weekdays (Monday - Friday)
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return
	}

	// Distributed lock to prevent duplicate billing across multiple app instances
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "daily_billing", 30*time.Minute)
		if !acquired {
			return
		}
		defer release()
	}

	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("DailyBillingWorker: failed to fetch tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantDailyBilling(ctx, &tenant)
	}
}

func (w *DailyBillingWorker) processTenantDailyBilling(ctx context.Context, tenant *domain.Tenant) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	if w.academicPeriod == nil || w.dailyBillUC == nil {
		return
	}

	activePeriod, err := w.academicPeriod.GetActive(tenantCtx)
	if err != nil || activePeriod == nil {
		// School is currently on vacation or no active term
		return
	}

	// Generate daily bills (amount 0 defaults to student-specific or service rate definitions)
	count, genErr := w.dailyBillUC.GenerateDailyBills(tenantCtx, 0.0)
	if genErr != nil {
		logger.Info("DailyBillingWorker: skipped or already generated for tenant",
			zap.String("tenant", tenant.SchemaName),
			zap.Error(genErr),
		)
		return
	}

	logger.Info("DailyBillingWorker: processed daily bills for tenant",
		zap.String("tenant", tenant.SchemaName),
		zap.Int("bills_processed", count),
	)
}
