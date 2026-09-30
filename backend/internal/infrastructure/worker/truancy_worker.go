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
	"gorm.io/gorm"
)

// TruancyWorker scans daily attendance records for unexcused absences and chronic truancy (3+ absences).
// It automatically flags at-risk students and sends notification/SMS digests to parents.
type TruancyWorker struct {
	db           *gorm.DB
	studentRepo  domain.StudentRepository
	guardianRepo domain.GuardianRepository
	sms          domain.SMSProvider
	notifUC      domain.NotificationUseCase
	interval     time.Duration
}

func NewTruancyWorker(
	db *gorm.DB,
	studentRepo domain.StudentRepository,
	guardianRepo domain.GuardianRepository,
	sms domain.SMSProvider,
	notifUC domain.NotificationUseCase,
	interval time.Duration,
) *TruancyWorker {
	if interval <= 0 {
		interval = 4 * time.Hour
	}
	return &TruancyWorker{
		db:           db,
		studentRepo:  studentRepo,
		guardianRepo: guardianRepo,
		sms:          sms,
		notifUC:      notifUC,
		interval:     interval,
	}
}

func (w *TruancyWorker) Name() string {
	return "TruancyWorker"
}

func (w *TruancyWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.evaluateAbsencesAcrossTenants(ctx)
		}
	}
}

func (w *TruancyWorker) evaluateAbsencesAcrossTenants(ctx context.Context) {
	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("TruancyWorker: failed to fetch tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantTruancy(ctx, &tenant)
	}
}

func (w *TruancyWorker) processTenantTruancy(ctx context.Context, tenant *domain.Tenant) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	today := time.Now().Format("2006-01-02")
	var todayAbsences []domain.Attendance
	err := w.db.WithContext(tenantCtx).
		Where("DATE(date) = ? AND status = ?", today, domain.StatusAbsent).
		Find(&todayAbsences).Error

	if err != nil || len(todayAbsences) == 0 {
		return
	}

	senderID := domain.DefaultSMSSenderID
	if tenant.SMSSenderID != "" {
		senderID = tenant.SMSSenderID
	}

	for _, att := range todayAbsences {
		student, sErr := w.studentRepo.GetByID(tenantCtx, att.StudentID)
		if sErr != nil || student == nil {
			continue
		}

		studentName := strings.TrimSpace(fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		if studentName == "" {
			studentName = "Your ward"
		}

		// Check consecutive absences in the last 14 days
		var recentAbsencesCount int64
		twoWeeksAgo := time.Now().AddDate(0, 0, -14)
		_ = w.db.WithContext(tenantCtx).Model(&domain.Attendance{}).
			Where("student_id = ? AND date >= ? AND status = ?", student.ID, twoWeeksAgo, domain.StatusAbsent).
			Count(&recentAbsencesCount).Error

		// Retrieve guardians to alert
		guardians, _ := w.guardianRepo.GetForStudent(tenantCtx, student.ID)
		for _, g := range guardians {
			if g == nil {
				continue
			}

			phone := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.PhoneNumber)))
			if phone == "" {
				continue
			}

			var alertMsg string
			if recentAbsencesCount >= 3 {
				alertMsg = fmt.Sprintf(
					"URGENT [%s]: %s has been recorded ABSENT today (%s). This is absence #%d in 2 weeks. Please contact the school immediately.",
					tenant.Name, studentName, today, recentAbsencesCount,
				)
			} else {
				alertMsg = fmt.Sprintf(
					"Attendance Alert [%s]: %s was marked ABSENT today (%s). If this is an error or excused, please inform the school.",
					tenant.Name, studentName, today,
				)
			}

			// Send SMS if credits available
			if w.sms != nil && tenant.SMSCredits > 0 {
				if smsErr := w.sms.SendSMS(tenantCtx, senderID, []string{phone}, alertMsg); smsErr == nil {
					_ = w.db.WithContext(ctx).Table("public.tenants").Where("id = ?", tenant.ID).
						UpdateColumn("sms_credits", gorm.Expr("sms_credits - 1")).Error
				}
			}

			// In-app push notification
			if w.notifUC != nil && g.UserID != uuid.Nil {
				_ = w.notifUC.SendToUser(tenantCtx, g.UserID, domain.Notification{
					UserID:  g.UserID,
					Type:    domain.NotificationAttendance,
					Title:   "Absence Notice: " + studentName,
					Message: alertMsg,
				})
			}
		}
	}
}
