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

// RecommendationWorker periodically analyzes student grades, performance trajectories,
// and curriculum trends across all active schools to generate AI/rule-based learning recommendations.
type RecommendationWorker struct {
	db        *gorm.DB
	recEngine domain.RecommendationEngine
	interval  time.Duration
}

func NewRecommendationWorker(
	db *gorm.DB,
	recEngine domain.RecommendationEngine,
	interval time.Duration,
) *RecommendationWorker {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	return &RecommendationWorker{
		db:        db,
		recEngine: recEngine,
		interval:  interval,
	}
}

func (w *RecommendationWorker) Name() string {
	return "RecommendationWorker"
}

func (w *RecommendationWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runInsights(ctx)
		}
	}
}

func (w *RecommendationWorker) runInsights(ctx context.Context) {
	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("RecommendationWorker: failed to fetch active tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantInsights(ctx, &tenant)
	}
}

func (w *RecommendationWorker) processTenantInsights(ctx context.Context, tenant *domain.Tenant) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	if w.recEngine == nil {
		return
	}

	start := time.Now()
	if err := w.recEngine.GenerateAllInsights(tenantCtx); err != nil {
		logger.Error("RecommendationWorker: failed to generate insights for tenant",
			err,
			zap.String("tenant", tenant.SchemaName),
		)
		return
	}

	logger.Info("RecommendationWorker: successfully generated academic insights",
		zap.String("tenant", tenant.SchemaName),
		zap.Duration("duration", time.Since(start)),
	)
}
