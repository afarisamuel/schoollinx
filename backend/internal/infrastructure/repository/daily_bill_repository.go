package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type dailyBillRepository struct {
	db *gorm.DB
}

func NewDailyBillRepository(db *gorm.DB) domain.DailyBillRepository {
	return &dailyBillRepository{db: db}
}

func (r *dailyBillRepository) BulkCreate(ctx context.Context, bills []domain.DailyBill) error {
	return r.db.WithContext(ctx).Create(&bills).Error
}

func (r *dailyBillRepository) GetByDate(ctx context.Context, date time.Time) ([]domain.DailyBill, error) {
	var bills []domain.DailyBill
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("date >= ? AND date < ?", start, end).
		Order("created_at DESC").
		Find(&bills).Error
	return bills, err
}

func (r *dailyBillRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.DailyBill, error) {
	var bills []domain.DailyBill
	err := r.db.WithContext(ctx).
		Where("student_id = ?", studentID).
		Order("date DESC").
		Find(&bills).Error
	return bills, err
}

func (r *dailyBillRepository) GetPendingByDate(ctx context.Context, date time.Time) ([]domain.DailyBill, error) {
	var bills []domain.DailyBill
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("date >= ? AND date < ? AND status = ?", start, end, domain.DailyBillPending).
		Find(&bills).Error
	return bills, err
}

func (r *dailyBillRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.DailyBill, error) {
	var bill domain.DailyBill
	if err := r.db.WithContext(ctx).Preload("Student").First(&bill, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &bill, nil
}

func (r *dailyBillRepository) MarkPaid(ctx context.Context, billID uuid.UUID, collectorID uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&domain.DailyBill{}).
		Where("id = ? AND status = ?", billID, domain.DailyBillPending).
		Updates(map[string]interface{}{
			"status":       domain.DailyBillPaid,
			"collected_by": collectorID,
			"collected_at": now,
		}).Error
}

func (r *dailyBillRepository) BatchMarkPaid(ctx context.Context, billIDs []uuid.UUID, collectorID uuid.UUID) (int64, error) {
	if len(billIDs) == 0 {
		return 0, nil
	}
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&domain.DailyBill{}).
		Where("id IN ? AND status = ?", billIDs, domain.DailyBillPending).
		Updates(map[string]interface{}{
			"status":       domain.DailyBillPaid,
			"collected_by": collectorID,
			"collected_at": now,
		})
	return result.RowsAffected, result.Error
}

func (r *dailyBillRepository) GetTodaysPendingBillByStudentID(ctx context.Context, studentID uuid.UUID, date time.Time) (*domain.DailyBill, error) {
	var bill domain.DailyBill
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("student_id = ? AND date >= ? AND date < ? AND status = ?", studentID, start, end, domain.DailyBillPending).
		First(&bill).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

func (r *dailyBillRepository) MarkOverdue(ctx context.Context, beforeDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Model(&domain.DailyBill{}).
		Where("date < ? AND status = ?", beforeDate, domain.DailyBillPending).
		Update("status", domain.DailyBillOverdue)
	return result.RowsAffected, result.Error
}

func (r *dailyBillRepository) GetCollectionsByCollector(ctx context.Context, collectorID uuid.UUID, date time.Time) ([]domain.DailyBill, error) {
	var bills []domain.DailyBill
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("collected_by = ? AND collected_at >= ? AND collected_at < ?", collectorID, start, end).
		Find(&bills).Error
	return bills, err
}

func (r *dailyBillRepository) GetOverdueBills(ctx context.Context, beforeDate time.Time) ([]domain.DailyBill, error) {
	var bills []domain.DailyBill
	err := r.db.WithContext(ctx).
		Preload("Student").
		Where("date < ? AND status = ?", beforeDate, domain.DailyBillPending).
		Find(&bills).Error
	return bills, err
}

func (r *dailyBillRepository) CreateHandover(ctx context.Context, handover *domain.DailyHandover) error {
	return r.db.WithContext(ctx).Create(handover).Error
}

func (r *dailyBillRepository) GetHandoversByDate(ctx context.Context, date time.Time) ([]domain.DailyHandover, error) {
	var handovers []domain.DailyHandover
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Collector").
		Preload("Bursar").
		Where("date >= ? AND date < ?", start, end).
		Order("created_at DESC").
		Find(&handovers).Error
	return handovers, err
}

func (r *dailyBillRepository) GetHandoverByID(ctx context.Context, id uuid.UUID) (*domain.DailyHandover, error) {
	var handover domain.DailyHandover
	err := r.db.WithContext(ctx).
		Preload("Collector").
		Preload("Bursar").
		Where("id = ?", id).
		First(&handover).Error
	if err != nil {
		return nil, err
	}
	return &handover, nil
}

func (r *dailyBillRepository) UpdateHandover(ctx context.Context, handover *domain.DailyHandover) error {
	return r.db.WithContext(ctx).Save(handover).Error
}

func (r *dailyBillRepository) ExistsForDate(ctx context.Context, date time.Time) (bool, error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.DailyBill{}).
		Where("date >= ? AND date < ?", start, end).
		Count(&count).Error
	return count > 0, err
}


