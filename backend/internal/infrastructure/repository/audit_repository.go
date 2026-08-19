package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type auditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) domain.AuditRepository {
	repo := &auditRepository{db: db}
	return repo
}

func (r *auditRepository) Create(ctx context.Context, log *domain.AuditLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *auditRepository) GetAll(ctx context.Context) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	err := r.db.WithContext(ctx).Order("created_at desc").Limit(100).Find(&logs).Error
	return logs, err
}

func (r *auditRepository) GetAllPaginated(ctx context.Context, query domain.PaginationQuery) ([]domain.AuditLog, int64, error) {
	var logs []domain.AuditLog
	var total int64

	db := r.db.WithContext(ctx).Model(&domain.AuditLog{})
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := db.Order("created_at desc").
		Offset(query.GetOffset()).
		Limit(query.Limit).
		Find(&logs).Error
	return logs, total, err
}

func (r *auditRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at desc").Find(&logs).Error
	return logs, err
}

func (r *auditRepository) SeedInitialLogs() {
	var count int64
	r.db.Model(&domain.AuditLog{}).Count(&count)
	if count > 0 {
		return
	}

	// Create some realistic seed data for the "real world" experience
	initialLogs := []domain.AuditLog{
		{
			Action:     domain.ActionUpdate,
			UserEmail:  "admin@njuases.edu",
			EntityType: "STUDENT",
			EntityID:   "STU-2026-001",
			Changes:    "Updated primary academic program to 'Advanced Sciences'",
			IPAddress:  "192.168.1.104",
			CreatedAt:  time.Now().Add(-15 * time.Minute),
		},
		{
			Action:     domain.ActionCreate,
			UserEmail:  "registrar@njuases.edu",
			EntityType: "GRADE",
			EntityID:   "GRD-9923",
			Changes:    "Finalized Semester 1 results for Class 10A",
			IPAddress:  "10.0.0.45",
			CreatedAt:  time.Now().Add(-2 * time.Hour),
		},
		{
			Action:     domain.ActionBulkDelete,
			UserEmail:  "sysadmin@njuases.edu",
			EntityType: "SESSION",
			EntityID:   "SESS-ARCHIVE",
			Changes:    "Expunged 142 expired authentication sessions",
			IPAddress:  "127.0.0.1",
			CreatedAt:  time.Now().Add(-24 * time.Hour),
		},
	}

	for _, log := range initialLogs {
		r.Create(context.Background(), &log)
	}
}
