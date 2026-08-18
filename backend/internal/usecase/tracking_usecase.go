package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type TrackingUseCase struct {
	repo domain.TrackingRepository
}

func NewTrackingUseCase(repo domain.TrackingRepository) *TrackingUseCase {
	return &TrackingUseCase{repo: repo}
}

func (u *TrackingUseCase) RecordPing(ctx context.Context, loc *domain.BusLocation) error {
	return u.repo.SaveLocation(ctx, loc)
}

func (u *TrackingUseCase) GetLatestLocation(ctx context.Context, routeID uuid.UUID) (*domain.BusLocation, error) {
	return u.repo.GetLatestLocation(ctx, routeID)
}

func (u *TrackingUseCase) GetRouteHistory(ctx context.Context, routeID uuid.UUID, since time.Time) ([]domain.BusLocation, error) {
	return u.repo.GetRouteHistory(ctx, routeID, since)
}
