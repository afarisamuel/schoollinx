package worker

import (
	"context"
	"time"

	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"github.com/user/high-school-management/backend/internal/usecase"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CampaignWorker scans for pending or stalled newsletter/communication campaigns across school tenants
// and dispatches them asynchronously through rate-limited email/SMS queues.
type CampaignWorker struct {
	db          *gorm.DB
	locker      Locker
	campaignMgr usecase.CampaignManager
	rateLimiter *RateLimiter
	interval    time.Duration
}

func NewCampaignWorker(
	db *gorm.DB,
	locker Locker,
	campaignMgr usecase.CampaignManager,
	interval time.Duration,
) *CampaignWorker {
	if interval <= 0 {
		interval = 1 * time.Minute
	}
	return &CampaignWorker{
		db:          db,
		locker:      locker,
		campaignMgr: campaignMgr,
		rateLimiter: NewRateLimiter(25), // Max 25 campaign dispatch triggers per second
		interval:    interval,
	}
}

func (w *CampaignWorker) Name() string {
	return "CampaignWorker"
}

func (w *CampaignWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	defer w.rateLimiter.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.processPendingCampaigns(ctx)
		}
	}
}

func (w *CampaignWorker) processPendingCampaigns(ctx context.Context) {
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "campaign_worker", 2*time.Minute)
		if !acquired {
			return
		}
		defer release()
	}

	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("CampaignWorker: failed to fetch tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantCampaigns(ctx, &tenant)
	}
}

func (w *CampaignWorker) processTenantCampaigns(ctx context.Context, tenant *domain.Tenant) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	if w.campaignMgr == nil {
		return
	}

	// Look for stalled SENDING campaigns older than 15 minutes to recover from server crashes
	var stalledCampaigns []domain.Campaign
	fifteenMinsAgo := time.Now().Add(-15 * time.Minute)
	_ = w.db.WithContext(tenantCtx).
		Where("status = ? AND updated_at < ?", domain.CampaignStatusSending, fifteenMinsAgo).
		Find(&stalledCampaigns).Error

	for _, c := range stalledCampaigns {
		_ = w.rateLimiter.Wait(ctx)
		logger.Warn("CampaignWorker: recovering stalled campaign",
			zap.String("campaign_id", c.ID.String()),
			zap.String("tenant", tenant.SchemaName),
		)
		_ = w.campaignMgr.DispatchCampaign(tenantCtx, c.ID)
	}
}
