package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ResourceType string

const (
	ResourceTypeBook      ResourceType = "BOOK"
	ResourceTypeLab       ResourceType = "LAB"
	ResourceTypeEquipment ResourceType = "EQUIPMENT"
)

type Resource struct {
	TenantBase
	ID          uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string       `json:"name" gorm:"not null"`
	Type        ResourceType `json:"type" gorm:"not null"`
	Description string       `json:"description"`
	CreatedAt   time.Time    `json:"created_at"`
}

func (r *Resource) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}

type BookingStatus string

const (
	BookingStatusConfirmed BookingStatus = "CONFIRMED"
	BookingStatusCancelled BookingStatus = "CANCELLED"
)

type Booking struct {
	TenantBase
	ID         uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	ResourceID uuid.UUID     `json:"resource_id" gorm:"type:uuid;not null"`
	UserID     uuid.UUID     `json:"user_id" gorm:"type:uuid;not null"`
	StartTime  time.Time     `json:"start_time" gorm:"not null"`
	EndTime    time.Time     `json:"end_time" gorm:"not null"`
	Status     BookingStatus `json:"status" gorm:"not null"`
	CreatedAt  time.Time     `json:"created_at"`
}

func (b *Booking) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

type ResourceRepository interface {
	CreateResource(ctx context.Context, res *Resource) error
	GetAllResources(ctx context.Context) ([]Resource, error)
	GetResourceByID(ctx context.Context, id uuid.UUID) (*Resource, error)

	CreateBooking(ctx context.Context, booking *Booking) error
	GetBookingsByResource(ctx context.Context, resourceID uuid.UUID) ([]Booking, error)
	GetBookingsByUser(ctx context.Context, userID uuid.UUID) ([]Booking, error)
	CheckOverlap(ctx context.Context, resourceID uuid.UUID, start, end time.Time) (bool, error)
}

type ResourceUseCase interface {
	ListResources(ctx context.Context) ([]Resource, error)
	BookResource(ctx context.Context, booking *Booking) error
	MyBookings(ctx context.Context, userID uuid.UUID) ([]Booking, error)
}
