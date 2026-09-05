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
	ResourceTypeRoom      ResourceType = "ROOM"
	ResourceTypeVehicle   ResourceType = "VEHICLE"
	ResourceTypeSports    ResourceType = "SPORTS"
)

type Resource struct {
	TenantBase
	ID          uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string       `json:"name" gorm:"not null"`
	Type        ResourceType `json:"type" gorm:"not null"`
	Description string       `json:"description"`
	Location    string       `json:"location"`
	Capacity    int          `json:"capacity"`
	Quantity    int          `json:"quantity" gorm:"default:1"`
	Status      string       `json:"status" gorm:"default:'AVAILABLE'"` // "AVAILABLE", "RESERVED", "MAINTENANCE"
	Custodian   string       `json:"custodian"`
	ImageURL    string       `json:"image_url"`
	Tags        string       `json:"tags"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
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
	BookingStatusCompleted BookingStatus = "COMPLETED"
)

type Booking struct {
	TenantBase
	ID           uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey"`
	ResourceID   uuid.UUID     `json:"resource_id" gorm:"type:uuid;not null"`
	ResourceName string        `json:"resource_name" gorm:"-"`
	ResourceType string        `json:"resource_type" gorm:"-"`
	UserID       uuid.UUID     `json:"user_id" gorm:"type:uuid;not null"`
	UserName     string        `json:"user_name" gorm:"-"`
	StartTime    time.Time     `json:"start_time" gorm:"not null"`
	EndTime      time.Time     `json:"end_time" gorm:"not null"`
	Purpose      string        `json:"purpose"`
	Headcount    int           `json:"headcount"`
	Notes        string        `json:"notes"`
	Status       BookingStatus `json:"status" gorm:"not null"`
	CreatedAt    time.Time     `json:"created_at"`
}

func (b *Booking) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

type ResourceRepository interface {
	CreateResource(ctx context.Context, res *Resource) error
	UpdateResource(ctx context.Context, res *Resource) error
	DeleteResource(ctx context.Context, id uuid.UUID) error
	GetAllResources(ctx context.Context) ([]Resource, error)
	GetResourceByID(ctx context.Context, id uuid.UUID) (*Resource, error)

	CreateBooking(ctx context.Context, booking *Booking) error
	CancelBooking(ctx context.Context, bookingID uuid.UUID) error
	GetAllBookings(ctx context.Context) ([]Booking, error)
	GetBookingsByResource(ctx context.Context, resourceID uuid.UUID) ([]Booking, error)
	GetBookingsByUser(ctx context.Context, userID uuid.UUID) ([]Booking, error)
	CheckOverlap(ctx context.Context, resourceID uuid.UUID, start, end time.Time, excludeBookingID ...uuid.UUID) (bool, error)
}

type ResourceUseCase interface {
	ListResources(ctx context.Context) ([]Resource, error)
	GetResource(ctx context.Context, id uuid.UUID) (*Resource, error)
	CreateResource(ctx context.Context, res *Resource) error
	UpdateResource(ctx context.Context, res *Resource) error
	DeleteResource(ctx context.Context, id uuid.UUID) error
	SeedDefaultResources(ctx context.Context) ([]Resource, error)

	BookResource(ctx context.Context, booking *Booking) error
	CancelBooking(ctx context.Context, bookingID uuid.UUID) error
	MyBookings(ctx context.Context, userID uuid.UUID) ([]Booking, error)
	AllBookings(ctx context.Context) ([]Booking, error)
}
