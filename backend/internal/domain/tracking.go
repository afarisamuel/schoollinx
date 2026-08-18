package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type BusLocation struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RouteID   uuid.UUID `json:"route_id" gorm:"type:uuid;not null;index"`
	Latitude  float64   `json:"latitude" gorm:"not null"`
	Longitude float64   `json:"longitude" gorm:"not null"`
	Speed     float64   `json:"speed"`
	Heading   float64   `json:"heading"`
	Timestamp time.Time `json:"timestamp" gorm:"not null;index"`
}

type TrackingRepository interface {
	SaveLocation(ctx context.Context, loc *BusLocation) error
	GetLatestLocation(ctx context.Context, routeID uuid.UUID) (*BusLocation, error)
	GetRouteHistory(ctx context.Context, routeID uuid.UUID, since time.Time) ([]BusLocation, error)
}
