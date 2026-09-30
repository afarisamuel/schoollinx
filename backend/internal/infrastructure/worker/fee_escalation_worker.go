package worker

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// FeeEscalationWorker checks for upcoming and overdue term fee deadlines across active school tenants,
// sending automated 3-tier gentle reminders (7d before, on due date, and 14d overdue).
type FeeEscalationWorker struct {
	db           *gorm.DB
	locker       Locker
	studentRepo  domain.StudentRepository
	guardianRepo domain.GuardianRepository
	fiscalRepo   domain.FiscalRepository
	sms          domain.SMSProvider
	notifUC      domain.NotificationUseCase
	interval     time.Duration
}

func NewFeeEscalationWorker(
	db *gorm.DB,
	locker Locker,
	studentRepo domain.StudentRepository,
	guardianRepo domain.GuardianRepository,
	fiscalRepo domain.FiscalRepository,
	sms domain.SMSProvider,
	notifUC domain.NotificationUseCase,
	interval time.Duration,
) *FeeEscalationWorker {
	if interval <= 0 {
		interval = 12 * time.Hour
	}
	return &FeeEscalationWorker{
		db:           db,
		locker:       locker,
		studentRepo:  studentRepo,
		guardianRepo: guardianRepo,
		fiscalRepo:   fiscalRepo,
		sms:          sms,
		notifUC:      notifUC,
		interval:     interval,
	}
}

func (w *FeeEscalationWorker) Name() string {
	return "FeeEscalationWorker"
}

func (w *FeeEscalationWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runEscalation(ctx)
		}
	}
}

func (w *FeeEscalationWorker) runEscalation(ctx context.Context) {
	now := time.Now()
	// Respect parent notification window (07:00 - 21:00)
	if !IsWithinNotificationWindow(now) {
		return
	}

	// Distributed lock to prevent multi-instance double messaging
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "fee_escalation", 30*time.Minute)
		if !acquired {
			return
		}
		defer release()
	}

	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("FeeEscalationWorker: failed to fetch tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantFees(ctx, &tenant, now)
	}
}

func (w *FeeEscalationWorker) processTenantFees(ctx context.Context, tenant *domain.Tenant, now time.Time) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	if w.fiscalRepo == nil || w.studentRepo == nil {
		return
	}

	students, err := w.studentRepo.GetAll(tenantCtx)
	if err != nil || len(students) == 0 {
		return
	}

	senderID := domain.DefaultSMSSenderID
	if tenant.SMSSenderID != "" {
		senderID = tenant.SMSSenderID
	}

	for _, s := range students {
		records, err := w.fiscalRepo.GetByStudent(tenantCtx, s.ID)
		if err != nil || len(records) == 0 {
			continue
		}

		var totalOwed float64
		var nearestDueDate *time.Time

		for _, r := range records {
			if r.Status == domain.PaymentStatusPending || r.Status == domain.PaymentStatusOverdue {
				balance := r.Amount - r.AmountPaid
				if balance > 0 {
					totalOwed += balance
					if !r.DueDate.IsZero() && (nearestDueDate == nil || r.DueDate.Before(*nearestDueDate)) {
						d := r.DueDate
						nearestDueDate = &d
					}
				}
			}
		}

		if totalOwed <= 0 || nearestDueDate == nil {
			continue
		}

		daysUntilDue := int(nearestDueDate.Sub(now).Hours() / 24)

		var msgTemplate string
		studentName := strings.TrimSpace(fmt.Sprintf("%s %s", string(s.FirstName), string(s.LastName)))

		if daysUntilDue == 7 {
			msgTemplate = fmt.Sprintf(
				"Fee Reminder [%s]: Term fees for %s (GHS %.2f) are due in 7 days (%s). Please make payment to avoid late penalties.",
				tenant.Name, studentName, totalOwed, nearestDueDate.Format("02 Jan 2006"),
			)
		} else if daysUntilDue == 0 {
			msgTemplate = fmt.Sprintf(
				"Fee Due Today [%s]: Outstanding fees for %s (GHS %.2f) are due today. Please settle via the Parent Portal.",
				tenant.Name, studentName, totalOwed,
			)
		} else if daysUntilDue == -14 {
			msgTemplate = fmt.Sprintf(
				"OVERDUE NOTICE [%s]: Fees for %s (GHS %.2f) are 14 days overdue. Please clear the outstanding balance immediately.",
				tenant.Name, studentName, totalOwed,
			)
		} else {
			continue // Only notify at defined milestones
		}

		guardians, _ := w.guardianRepo.GetForStudent(tenantCtx, s.ID)
		for _, g := range guardians {
			if g == nil {
				continue
			}

			phone := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.PhoneNumber)))
			if phone != "" && w.sms != nil && tenant.SMSCredits > 0 {
				if smsErr := w.sms.SendSMS(tenantCtx, senderID, []string{phone}, msgTemplate); smsErr == nil {
					_ = w.db.WithContext(ctx).Table("public.tenants").Where("id = ?", tenant.ID).
						UpdateColumn("sms_credits", gorm.Expr("sms_credits - 1")).Error
				}
			}

			if w.notifUC != nil && g.UserID != uuid.Nil {
				_ = w.notifUC.SendToUser(tenantCtx, g.UserID, domain.Notification{
					UserID:  g.UserID,
					Type:    domain.NotificationPayment,
					Title:   "Fee Notice: " + studentName,
					Message: msgTemplate,
				})
			}
		}
	}

	logger.Info("FeeEscalationWorker: processed fee checks",
		zap.String("tenant", tenant.SchemaName),
		zap.Int("student_count", len(students)),
	)
}
