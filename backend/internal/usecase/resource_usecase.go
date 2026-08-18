package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type resourceUseCase struct {
	repo domain.ResourceRepository
}

func NewResourceUseCase(repo domain.ResourceRepository) domain.ResourceUseCase {
	return &resourceUseCase{repo: repo}
}

func (u *resourceUseCase) ListResources(ctx context.Context) ([]domain.Resource, error) {
	return u.repo.GetAllResources(ctx)
}

func (u *resourceUseCase) BookResource(ctx context.Context, booking *domain.Booking) error {
	// 1. Validate time
	if booking.StartTime.After(booking.EndTime) || booking.StartTime.Equal(booking.EndTime) {
		return errors.New("start time must be before end time")
	}

	// 2. Check for resource existence
	_, err := u.repo.GetResourceByID(ctx, booking.ResourceID)
	if err != nil {
		return errors.New("resource not found")
	}

	// 3. Check for overlaps
	overlaps, err := u.repo.CheckOverlap(ctx, booking.ResourceID, booking.StartTime, booking.EndTime)
	if err != nil {
		return err
	}
	if overlaps {
		return errors.New("resource is already booked for this time period")
	}

	booking.Status = domain.BookingStatusConfirmed
	return u.repo.CreateBooking(ctx, booking)
}

func (u *resourceUseCase) MyBookings(ctx context.Context, userID uuid.UUID) ([]domain.Booking, error) {
	return u.repo.GetBookingsByUser(ctx, userID)
}
