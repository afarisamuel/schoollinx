package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"gorm.io/gorm"
)

// TenantMonitorWorker continuously inspects active school tenants to:
// 1. Alert administrators of impending subscription/trial expiration (at 7d, 3d, 1d).
// 2. Alert schools when their prepaid SMS credit balance falls below threshold (<= 50 credits).
type TenantMonitorWorker struct {
	db       *gorm.DB
	mailer   mailer.MailService
	sms      domain.SMSProvider
	notifUC  domain.NotificationUseCase
	interval time.Duration
}

func NewTenantMonitorWorker(
	db *gorm.DB,
	mailSvc mailer.MailService,
	sms domain.SMSProvider,
	notifUC domain.NotificationUseCase,
	interval time.Duration,
) *TenantMonitorWorker {
	if interval <= 0 {
		interval = 12 * time.Hour
	}
	return &TenantMonitorWorker{
		db:       db,
		mailer:   mailSvc,
		sms:      sms,
		notifUC:  notifUC,
		interval: interval,
	}
}

func (w *TenantMonitorWorker) Name() string {
	return "TenantMonitorWorker"
}

func (w *TenantMonitorWorker) Start(ctx context.Context) {
	// Run initial inspection on startup
	w.inspectTenants(ctx)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.inspectTenants(ctx)
		}
	}
}

func (w *TenantMonitorWorker) inspectTenants(ctx context.Context) {
	reqCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	var tenants []domain.Tenant
	if err := w.db.WithContext(reqCtx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("TenantMonitorWorker: failed to fetch active tenants", err)
		return
	}

	now := time.Now()
	for _, t := range tenants {
		tenant := t
		// 1. Check SMS Credit threshold
		if tenant.SMSCredits <= 50 {
			w.sendLowSMSAlert(reqCtx, &tenant)
		}

		// 2. Check Subscription or Trial Expiration
		w.checkSubscriptionExpiry(reqCtx, &tenant, now)
	}
}

func (w *TenantMonitorWorker) sendLowSMSAlert(ctx context.Context, tenant *domain.Tenant) {
	if tenant.Email == "" && tenant.ContactNumbers == "" {
		return
	}

	subject := fmt.Sprintf("⚠️ Low SMS Credit Alert: %s (%d Credits Remaining)", tenant.Name, tenant.SMSCredits)
	htmlBody := fmt.Sprintf(
		`<h2>Low SMS Balance Warning</h2>
		<p>Dear Administrator,</p>
		<p>Your school portal <strong>%s</strong> currently has <strong>%d</strong> SMS credits remaining.</p>
		<p>Please top up your SMS bundle on your billing dashboard under <em>Settings &gt; SMS Management</em> to avoid interruption of parent notifications.</p>
		<p>Best regards,<br/>SchoolLinx Platform Team</p>`,
		tenant.Name, tenant.SMSCredits,
	)

	if w.mailer != nil && tenant.Email != "" {
		_ = w.mailer.SendBulkHTML(ctx, subject, htmlBody, []string{tenant.Email})
	}

	if w.notifUC != nil {
		tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
		_ = w.notifUC.Broadcast(tenantCtx, domain.Notification{
			Type:    domain.NotificationPayment,
			Title:   "Low SMS Credits",
			Message: fmt.Sprintf("Your portal only has %d SMS units remaining. Please recharge your SMS balance.", tenant.SMSCredits),
		})
	}
}

func (w *TenantMonitorWorker) checkSubscriptionExpiry(ctx context.Context, tenant *domain.Tenant, now time.Time) {
	var expiryDate *time.Time
	if tenant.TrialEndsAt != nil && tenant.TrialEndsAt.After(now) {
		expiryDate = tenant.TrialEndsAt
	} else if tenant.BillingDueDate != nil {
		expiryDate = tenant.BillingDueDate
	}

	if expiryDate == nil {
		return
	}

	daysRemaining := int(time.Until(*expiryDate).Hours() / 24)

	// Alert on milestones: 7 days, 3 days, 1 day, or expired today
	if daysRemaining == 7 || daysRemaining == 3 || daysRemaining == 1 || daysRemaining <= 0 {
		subject := fmt.Sprintf("🔔 SchoolLinx Subscription Notice: %s (%d days remaining)", tenant.Name, daysRemaining)
		if daysRemaining <= 0 {
			subject = fmt.Sprintf("🚨 SchoolLinx Subscription Expired: %s", tenant.Name)
		}

		htmlBody := fmt.Sprintf(
			`<h2>Subscription Renewal Notification</h2>
			<p>Dear %s Administrator,</p>
			<p>This is a notice that your SchoolLinx platform subscription is due for renewal on <strong>%s</strong> (%d days remaining).</p>
			<p>Please log in to your School Management dashboard under <em>Settings &gt; Billing &amp; Subscriptions</em> to complete your renewal and ensure continuous service.</p>
			<p>Best regards,<br/>SchoolLinx Billing Team</p>`,
			tenant.Name, expiryDate.Format("02 Jan 2006"), daysRemaining,
		)

		if w.mailer != nil && tenant.Email != "" {
			_ = w.mailer.SendBulkHTML(ctx, subject, htmlBody, []string{tenant.Email})
		}

		if w.notifUC != nil {
			tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
			_ = w.notifUC.Broadcast(tenantCtx, domain.Notification{
				Type:    domain.NotificationPayment,
				Title:   "Subscription Renewal Notice",
				Message: fmt.Sprintf("Your school subscription will expire in %d days (%s).", daysRemaining, expiryDate.Format("02 Jan 2006")),
			})
		}
	}
}
