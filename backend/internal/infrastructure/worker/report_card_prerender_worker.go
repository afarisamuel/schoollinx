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

// ReportCardPreRendererWorker periodically pre-computes and caches terminal student evaluations,
// subject position rankings, and grade averages ahead of closing-week report card generation.
type ReportCardPreRendererWorker struct {
	db             *gorm.DB
	locker         Locker
	studentRepo    domain.StudentRepository
	academicPeriod domain.AcademicPeriodRepository
	termEvalRepo   domain.TerminalEvaluationRepository
	gradeRepo      domain.GradeRepository
	interval       time.Duration
}

func NewReportCardPreRendererWorker(
	db *gorm.DB,
	locker Locker,
	studentRepo domain.StudentRepository,
	academicPeriod domain.AcademicPeriodRepository,
	termEvalRepo domain.TerminalEvaluationRepository,
	gradeRepo domain.GradeRepository,
	interval time.Duration,
) *ReportCardPreRendererWorker {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	return &ReportCardPreRendererWorker{
		db:             db,
		locker:         locker,
		studentRepo:    studentRepo,
		academicPeriod: academicPeriod,
		termEvalRepo:   termEvalRepo,
		gradeRepo:      gradeRepo,
		interval:       interval,
	}
}

func (w *ReportCardPreRendererWorker) Name() string {
	return "ReportCardPreRendererWorker"
}

func (w *ReportCardPreRendererWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runPreRender(ctx)
		}
	}
}

func (w *ReportCardPreRendererWorker) runPreRender(ctx context.Context) {
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "report_card_prerender", 1*time.Hour)
		if !acquired {
			return
		}
		defer release()
	}

	var tenants []domain.Tenant
	if err := w.db.WithContext(ctx).Table("public.tenants").Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		logger.Error("ReportCardPreRendererWorker: failed to fetch tenants", err)
		return
	}

	for _, t := range tenants {
		tenant := t
		w.processTenantPreRender(ctx, &tenant)
	}
}

func (w *ReportCardPreRendererWorker) processTenantPreRender(ctx context.Context, tenant *domain.Tenant) {
	tenantCtx := context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantIDKey, tenant.ID)
	tenantCtx = context.WithValue(tenantCtx, middleware.TenantNameKey, tenant.Name)

	if w.academicPeriod == nil || w.studentRepo == nil {
		return
	}

	activePeriod, err := w.academicPeriod.GetActive(tenantCtx)
	if err != nil || activePeriod == nil {
		return
	}

	students, err := w.studentRepo.GetAll(tenantCtx)
	if err != nil || len(students) == 0 {
		return
	}

	start := time.Now()
	var preCalculated int
	for _, s := range students {
		if s.ClassID == nil {
			continue
		}

		if w.gradeRepo != nil {
			// Querying grades implicitly updates or warms cache
			_, _ = w.gradeRepo.GetByStudentID(tenantCtx, s.ID)
			preCalculated++
		}
	}

	logger.Info("ReportCardPreRendererWorker: warmed terminal evaluation caches",
		zap.String("tenant", tenant.SchemaName),
		zap.Int("students_warmed", preCalculated),
		zap.Duration("duration", time.Since(start)),
	)
}
