package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TransportRoute represents a school bus route
type TransportRoute struct {
	ID                     uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name                   string     `json:"name" gorm:"not null"`
	DriverName             string     `json:"driver_name"`
	DriverPhone            string     `json:"driver_phone"`
	VehicleInfo            string     `json:"vehicle_info"`
	VehiclePlate           string     `json:"vehicle_plate"`
	Capacity               int        `json:"capacity" gorm:"default:0"`
	IsActive               bool       `json:"is_active" gorm:"default:true"`
	DailyFee               float64    `json:"daily_fee"`
	CurrentLat             float64    `json:"current_lat" gorm:"default:0"`
	CurrentLng             float64    `json:"current_lng" gorm:"default:0"`
	SpeedKmh               float64    `json:"speed_kmh" gorm:"default:0"`
	HeadingDeg             float64    `json:"heading_deg" gorm:"default:0"`
	NextStopName           string      `json:"next_stop_name"`
	EstimatedArrivalMins   int         `json:"estimated_arrival_mins" gorm:"default:0"`
	LastPingAt             *time.Time  `json:"last_ping_at"`
	Stops                  []RouteStop `json:"stops,omitempty" gorm:"foreignKey:RouteID"`
	CreatedAt              time.Time   `json:"created_at"`
}

// RouteStop is a named pickup/dropoff point on a route
type RouteStop struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RouteID   uuid.UUID `json:"route_id" gorm:"type:uuid;not null;index"`
	Name      string    `json:"name" gorm:"not null"`
	Order     int       `json:"order" gorm:"not null"`
	Status    string    `json:"status" gorm:"default:'UPCOMING'"` // DEPARTED, NEXT, UPCOMING
	Time      string    `json:"time"`
	CreatedAt time.Time `json:"created_at"`
}

// BusAssignment tracks which student uses which bus route
type BusAssignment struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	StudentID uuid.UUID `json:"student_id" gorm:"type:uuid;not null"`
	Student   *Student  `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	RouteID   uuid.UUID `json:"route_id" gorm:"type:uuid;not null"`
	PickUp    string    `json:"pick_up"`
	DropOff   string    `json:"drop_off"`
	CreatedAt time.Time `json:"created_at"`
}

// MealPlan represents available canteen plans
type MealPlan struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"not null"` // e.g. "Lunch Only", "Full Boarding"
	Description string    `json:"description"`
	TermFee     float64   `json:"term_fee"`
	CreatedAt   time.Time `json:"created_at"`
}

// CanteenSubscription tracks a student's meal plan
type CanteenSubscription struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	StudentID  uuid.UUID `json:"student_id" gorm:"type:uuid;not null"`
	MealPlanID uuid.UUID `json:"meal_plan_id" gorm:"type:uuid;not null"`
	Term       string    `json:"term"`
	IsActive   bool      `json:"is_active" gorm:"default:true"`
	CreatedAt  time.Time `json:"created_at"`
}

type LogisticsRepository interface {
	// Transport
	GetRoutes(ctx context.Context) ([]TransportRoute, error)
	GetRouteByID(ctx context.Context, id uuid.UUID) (*TransportRoute, error)
	CreateRoute(ctx context.Context, route *TransportRoute) error
	DeleteRoute(ctx context.Context, id uuid.UUID) error
	UpdateRouteGPS(ctx context.Context, routeID uuid.UUID, lat, lng, speed, heading float64, nextStop string, eta int) error
	AssignBus(ctx context.Context, assignment *BusAssignment) error
	GetStudentTransport(ctx context.Context, studentID uuid.UUID) (*BusAssignment, error)
	GetAssignmentsByRoute(ctx context.Context, routeID uuid.UUID) ([]BusAssignment, error)
	GetStudentsWithoutRoute(ctx context.Context) ([]Student, error)

	// Canteen
	GetMealPlans(ctx context.Context) ([]MealPlan, error)
	CreateMealPlan(ctx context.Context, plan *MealPlan) error
	SubscribeToCanteen(ctx context.Context, sub *CanteenSubscription) error
	GetStudentMealPlan(ctx context.Context, studentID uuid.UUID) (*CanteenSubscription, error)
}

type LogisticsUseCase interface {
	// Transport
	GetAllRoutes(ctx context.Context) ([]TransportRoute, error)
	GetRouteByID(ctx context.Context, id uuid.UUID) (*TransportRoute, error)
	AddRoute(ctx context.Context, route *TransportRoute) error
	DeleteRoute(ctx context.Context, id uuid.UUID) error
	GetRoutePassengers(ctx context.Context, routeID uuid.UUID) ([]BusAssignment, error)
	UpdateBusGPS(ctx context.Context, routeID uuid.UUID, lat, lng, speed, heading float64, nextStop string, eta int) error
	AssignStudentToBus(ctx context.Context, assignment *BusAssignment) error
	GetTransportForStudent(ctx context.Context, studentID uuid.UUID) (*BusAssignment, error)

	// Canteen
	GetAllMealPlans(ctx context.Context) ([]MealPlan, error)
	AddMealPlan(ctx context.Context, plan *MealPlan) error
	SubscribeStudent(ctx context.Context, sub *CanteenSubscription) error
	GetSubscriptionForStudent(ctx context.Context, studentID uuid.UUID) (*CanteenSubscription, error)
}
