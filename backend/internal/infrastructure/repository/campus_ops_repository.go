package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type campusOpsRepository struct {
	db *gorm.DB
}

func NewCampusOpsRepository(db *gorm.DB) domain.CampusOpsRepository {
	return &campusOpsRepository{db: db}
}

// Lost and Found
func (r *campusOpsRepository) CreateLostItem(ctx context.Context, item *domain.LostAndFoundItem) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *campusOpsRepository) GetLostItems(ctx context.Context) ([]*domain.LostAndFoundItem, error) {
	var items []*domain.LostAndFoundItem
	if err := r.db.WithContext(ctx).Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *campusOpsRepository) UpdateLostItemStatus(ctx context.Context, id uuid.UUID, status string, claimedBy *uuid.UUID) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}
	if claimedBy != nil {
		updates["claimed_by_id"] = claimedBy
		now := time.Now()
		updates["date_claimed"] = &now
	}
	return r.db.WithContext(ctx).Model(&domain.LostAndFoundItem{}).Where("id = ?", id).Updates(updates).Error
}

// Visitors
func (r *campusOpsRepository) CreateVisitorLog(ctx context.Context, log *domain.VisitorLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *campusOpsRepository) GetActiveVisitors(ctx context.Context) ([]*domain.VisitorLog, error) {
	var logs []*domain.VisitorLog
	if err := r.db.WithContext(ctx).Where("status = ?", "ACTIVE").Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *campusOpsRepository) SignOutVisitor(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":    "SIGNED_OUT",
		"check_out": now,
	}
	return r.db.WithContext(ctx).Model(&domain.VisitorLog{}).Where("id = ?", id).Updates(updates).Error
}

// Disciplinary
func (r *campusOpsRepository) CreateDisciplinaryIncident(ctx context.Context, incident *domain.DisciplinaryIncident) error {
	return r.db.WithContext(ctx).Create(incident).Error
}

func (r *campusOpsRepository) GetStudentIncidents(ctx context.Context, studentID uuid.UUID) ([]*domain.DisciplinaryIncident, error) {
	var incidents []*domain.DisciplinaryIncident
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&incidents).Error; err != nil {
		return nil, err
	}
	return incidents, nil
}

func (r *campusOpsRepository) UpdateIncidentStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).Model(&domain.DisciplinaryIncident{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}).Error
}
