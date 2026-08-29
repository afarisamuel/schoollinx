package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// InventoryItem tracks school assets and consumables
type InventoryItem struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name               string     `json:"name" gorm:"not null"`
	AssetTag           string     `json:"asset_tag" gorm:"uniqueIndex"`    // Unique tag e.g. "AST-0023"
	Category           string     `json:"category"`                        // e.g., "Furniture", "Electronics"
	Quantity           int        `json:"quantity" gorm:"not null;default:0"`
	ReorderThreshold   int        `json:"reorder_threshold" gorm:"default:0"` // When to trigger low stock alert
	UnitValue          float64    `json:"unit_value"`
	AcquisitionDate    *time.Time `json:"acquisition_date"`
	DepreciationRate   float64    `json:"depreciation_rate" gorm:"default:0"` // Annual % depreciation
	CurrentValue       float64    `json:"current_value"`                       // Computed/stored book value
	Location           string     `json:"location"`
	Status             string     `json:"status" gorm:"default:'ACTIVE'"` // ACTIVE, DISPOSED, MAINTENANCE
	LastUpdated        time.Time  `json:"last_updated"`
	CreatedAt          time.Time  `json:"created_at"`
}

// VisitorLog tracks guests entering the school
type VisitorLog struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string     `json:"name" gorm:"not null"`
	Phone       string     `json:"phone"`
	Purpose     string     `json:"purpose"`
	HostID      uuid.UUID  `json:"host_id" gorm:"type:uuid"` // Who they are visiting (Teacher/Student/Admin)
	CheckIn     time.Time  `json:"check_in" gorm:"not null"`
	CheckOut    *time.Time `json:"check_out"`
	Status      string     `json:"status" gorm:"default:'ACTIVE'"` // ACTIVE, SIGNED_OUT
	BadgeNumber *string    `json:"badge_number"`
	CreatedAt   time.Time  `json:"created_at"`
}

// Room represents a bookable room or resource
type Room struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name      string    `json:"name" gorm:"not null;uniqueIndex"` // e.g. "Science Lab 1", "Hall A"
	Capacity  int       `json:"capacity"`
	Type      string    `json:"type"`   // CLASSROOM, LAB, HALL, SPORTS
	CreatedAt time.Time `json:"created_at"`
}

type RoomBooking struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RoomID    uuid.UUID `json:"room_id" gorm:"type:uuid;not null;index"`
	Room      *Room     `json:"room,omitempty" gorm:"foreignKey:RoomID"`
	BookerID  uuid.UUID `json:"booker_id" gorm:"type:uuid;not null"`
	Purpose   string    `json:"purpose" gorm:"not null"`
	StartTime time.Time `json:"start_time" gorm:"not null"`
	EndTime   time.Time `json:"end_time" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// FacilityUsageLog tracks actual usage vs booked usage, or ad-hoc usage
type FacilityUsageLog struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RoomID    uuid.UUID `json:"room_id" gorm:"type:uuid;not null;index"`
	Room      *Room     `json:"room,omitempty" gorm:"foreignKey:RoomID"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	StartTime time.Time `json:"start_time" gorm:"not null"`
	EndTime   time.Time `json:"end_time"`
	Purpose   string    `json:"purpose"`
	Notes     string    `json:"notes"`
}

// ResourceHeatmap represents aggregated usage data
type ResourceHeatmap struct {
	RoomName    string `json:"room_name"`
	DayOfWeek   int    `json:"day_of_week"` // 0=Sun, 6=Sat
	HourOfDay   int    `json:"hour_of_day"` // 0-23
	Utilization int    `json:"utilization"` // percentage 0-100
}

// AssetCheckout tracks student or teacher barcode loans (Feature 19)
type AssetCheckout struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AssetTag     string     `json:"asset_tag" gorm:"not null;index"`
	ItemName     string     `json:"item_name" gorm:"not null"`
	BorrowerID   uuid.UUID  `json:"borrower_id" gorm:"type:uuid;not null;index"`
	BorrowerName string     `json:"borrower_name"`
	BorrowerRole string     `json:"borrower_role" gorm:"default:'STUDENT'"` // STUDENT, TEACHER
	CheckedOutAt time.Time  `json:"checked_out_at"`
	DueDate      time.Time  `json:"due_date"`
	ReturnedAt   *time.Time `json:"returned_at"`
	Condition    string     `json:"condition" gorm:"default:'GOOD'"` // GOOD, FAIR, DAMAGED
	CreatedAt    time.Time  `json:"created_at"`
}

type FacilityRepository interface {
	// Inventory / Assets
	GetInventoryItems(ctx context.Context) ([]InventoryItem, error)
	CreateInventoryItem(ctx context.Context, item *InventoryItem) error
	UpdateInventoryItem(ctx context.Context, item *InventoryItem) error
	UpdateInventoryQuantity(ctx context.Context, id uuid.UUID, quantity int) error
	DeleteInventoryItem(ctx context.Context, id uuid.UUID) error

	// Barcode Asset Checkouts (Feature 19)
	CreateAssetCheckout(ctx context.Context, checkout *AssetCheckout) error
	UpdateAssetReturn(ctx context.Context, checkoutID uuid.UUID, condition string, returnedAt time.Time) error
	GetActiveAssetCheckouts(ctx context.Context) ([]AssetCheckout, error)

	// Visitors
	GetVisitorLogs(ctx context.Context, date time.Time) ([]VisitorLog, error)
	CheckInVisitor(ctx context.Context, log *VisitorLog) error
	CheckOutVisitor(ctx context.Context, id uuid.UUID, checkOutTime time.Time) error

	// Rooms & Bookings
	GetRooms(ctx context.Context) ([]Room, error)
	CreateRoom(ctx context.Context, room *Room) error
	GetRoomBookings(ctx context.Context, roomID uuid.UUID, date time.Time) ([]RoomBooking, error)
	CreateRoomBooking(ctx context.Context, booking *RoomBooking) error
	DeleteRoomBooking(ctx context.Context, id uuid.UUID) error
	CheckRoomAvailability(ctx context.Context, roomID uuid.UUID, start, end time.Time) (bool, error)
	
	// Usage & Heatmap
	LogFacilityUsage(ctx context.Context, log *FacilityUsageLog) error
	GetResourceHeatmap(ctx context.Context) ([]ResourceHeatmap, error)
}

type FacilityUseCase interface {
	// Inventory / Assets
	GetAllInventory(ctx context.Context) ([]InventoryItem, error)
	AddInventoryItem(ctx context.Context, item *InventoryItem) error
	UpdateAsset(ctx context.Context, item *InventoryItem) error
	AdjustInventory(ctx context.Context, id uuid.UUID, quantity int) error
	RemoveInventoryItem(ctx context.Context, id uuid.UUID) error

	// Barcode Asset Checkouts (Feature 19)
	CheckoutAsset(ctx context.Context, checkout *AssetCheckout) error
	ReturnAsset(ctx context.Context, checkoutID uuid.UUID, condition string) error
	GetActiveCheckouts(ctx context.Context) ([]AssetCheckout, error)

	// Visitors
	GetDailyVisitors(ctx context.Context, date time.Time) ([]VisitorLog, error)
	RegisterVisitor(ctx context.Context, log *VisitorLog) error
	SignOutVisitor(ctx context.Context, id uuid.UUID) error

	// Rooms & Bookings
	GetAllRooms(ctx context.Context) ([]Room, error)
	AddRoom(ctx context.Context, room *Room) error
	BookRoom(ctx context.Context, booking *RoomBooking) error
	CancelBooking(ctx context.Context, id uuid.UUID) error
	
	GetRoomSchedule(ctx context.Context, roomID uuid.UUID, date time.Time) ([]RoomBooking, error)
	
	// Usage & Heatmap
	LogFacilityUsage(ctx context.Context, log *FacilityUsageLog) error
	GetResourceHeatmap(ctx context.Context) ([]ResourceHeatmap, error)
}
