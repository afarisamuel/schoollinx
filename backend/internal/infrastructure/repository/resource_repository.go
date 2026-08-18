package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type resourceRepository struct {
	db *gorm.DB
}

func NewResourceRepository(db *gorm.DB) domain.ResourceRepository {
	return &resourceRepository{db: db}
}

func (r *resourceRepository) CreateResource(ctx context.Context, res *domain.Resource) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(res).Error
}

func (r *resourceRepository) GetAllResources(ctx context.Context) ([]domain.Resource, error) {
	var resources []domain.Resource
	if r.db == nil {
		return resources, nil
	}
	err := r.db.WithContext(ctx).Find(&resources).Error
	return resources, err
}

func (r *resourceRepository) GetResourceByID(ctx context.Context, id uuid.UUID) (*domain.Resource, error) {
	var res domain.Resource
	if r.db == nil {
		return &res, nil
	}
	err := r.db.WithContext(ctx).First(&res, "id = ?", id).Error
	return &res, err
}

func (r *resourceRepository) CreateBooking(ctx context.Context, booking *domain.Booking) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(booking).Error
}

func (r *resourceRepository) GetBookingsByResource(ctx context.Context, resourceID uuid.UUID) ([]domain.Booking, error) {
	var bookings []domain.Booking
	if r.db == nil {
		return bookings, nil
	}
	err := r.db.WithContext(ctx).Where("resource_id = ? AND status = ?", resourceID, domain.BookingStatusConfirmed).Find(&bookings).Error
	return bookings, err
}

func (r *resourceRepository) GetBookingsByUser(ctx context.Context, userID uuid.UUID) ([]domain.Booking, error) {
	var bookings []domain.Booking
	if r.db == nil {
		return bookings, nil
	}
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("start_time DESC").Find(&bookings).Error
	return bookings, err
}

func (r *resourceRepository) CheckOverlap(ctx context.Context, resourceID uuid.UUID, start, end time.Time) (bool, error) {
	var count int64
	if r.db == nil {
		return false, nil
	}
	// Overlap logic: StartA < EndB AND EndA > StartB
	err := r.db.WithContext(ctx).Model(&domain.Booking{}).
		Where("resource_id = ? AND status = ? AND start_time < ? AND end_time > ?",
			resourceID, domain.BookingStatusConfirmed, end, start).
		Count(&count).Error

	return count > 0, err
}
