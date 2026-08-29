package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/domain"
)

type welfareRepository struct {
	db *gorm.DB
}

func NewWelfareRepository(db *gorm.DB) domain.WelfareRepository {
	return &welfareRepository{db: db}
}

// Health Records
func (r *welfareRepository) GetHealthRecord(ctx context.Context, studentID uuid.UUID) (*domain.HealthRecord, error) {
	var record domain.HealthRecord
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No record yet
		}
		return nil, err
	}
	return &record, nil
}

func (r *welfareRepository) UpsertHealthRecord(ctx context.Context, record *domain.HealthRecord) error {
	var existing domain.HealthRecord
	err := r.db.WithContext(ctx).Where("student_id = ?", record.StudentID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.WithContext(ctx).Create(record).Error
		}
		return err
	}
	
	record.ID = existing.ID
	return r.db.WithContext(ctx).Save(record).Error
}

// Behavior Logs
func (r *welfareRepository) GetBehaviorLogs(ctx context.Context, studentID uuid.UUID) ([]domain.BehaviorLog, error) {
	var logs []domain.BehaviorLog
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Order("date desc").Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *welfareRepository) CreateBehaviorLog(ctx context.Context, log *domain.BehaviorLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *welfareRepository) DeleteBehaviorLog(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.BehaviorLog{}, "id = ?", id).Error
}

// Sickbay EMR (Feature 17)
func (r *welfareRepository) CreateSickbayVisit(ctx context.Context, visit *domain.SickbayVisit) error {
	if visit.ID == uuid.Nil {
		visit.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(visit).Error
}

func (r *welfareRepository) GetSickbayVisitsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.SickbayVisit, error) {
	var visits []domain.SickbayVisit
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Order("created_at DESC").Find(&visits).Error
	return visits, err
}
