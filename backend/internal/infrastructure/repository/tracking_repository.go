package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type trackingRepository struct {
	db *gorm.DB
}

func NewTrackingRepository(db *gorm.DB) domain.TrackingRepository {
	return &trackingRepository{db: db}
}

func (r *trackingRepository) SaveLocation(ctx context.Context, loc *domain.BusLocation) error {
	if loc.ID == uuid.Nil {
		loc.ID = uuid.New()
	}
	if loc.Timestamp.IsZero() {
		loc.Timestamp = time.Now()
	}
	return r.db.WithContext(ctx).Create(loc).Error
}

func (r *trackingRepository) GetLatestLocation(ctx context.Context, routeID uuid.UUID) (*domain.BusLocation, error) {
	var loc domain.BusLocation
	if err := r.db.WithContext(ctx).Where("route_id = ?", routeID).Order("timestamp DESC").First(&loc).Error; err != nil {
		return nil, err
	}
	return &loc, nil
}

func (r *trackingRepository) GetRouteHistory(ctx context.Context, routeID uuid.UUID, since time.Time) ([]domain.BusLocation, error) {
	var history []domain.BusLocation
	if err := r.db.WithContext(ctx).Where("route_id = ? AND timestamp >= ?", routeID, since).Order("timestamp ASC").Find(&history).Error; err != nil {
		return nil, err
	}
	return history, nil
}
