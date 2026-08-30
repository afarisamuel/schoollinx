package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type logisticsUseCase struct {
	repo domain.LogisticsRepository
}

func NewLogisticsUseCase(repo domain.LogisticsRepository) domain.LogisticsUseCase {
	return &logisticsUseCase{repo: repo}
}

// Transport
func (u *logisticsUseCase) GetAllRoutes(ctx context.Context) ([]domain.TransportRoute, error) {
	routes, err := u.repo.GetRoutes(ctx)
	if err != nil {
		return nil, err
	}
	if len(routes) == 0 {
		now := time.Now()
		r1 := domain.TransportRoute{
			Name:                 "Route 1: East Legon & Airport Express",
			VehiclePlate:         "GR 4820-24",
			VehicleInfo:          "Toyota Coaster (32-Seater • AC)",
			DriverName:           "Driver Kwame Mensah",
			DriverPhone:          "+233 24 411 2233",
			Capacity:             32,
			IsActive:             true,
			DailyFee:             25.0,
			CurrentLat:           5.6358,
			CurrentLng:           -0.1611,
			SpeedKmh:             38.5,
			HeadingDeg:           45,
			NextStopName:         "Boundary Road Junction",
			EstimatedArrivalMins: 8,
			LastPingAt:           &now,
			Stops: []domain.RouteStop{
				{Name: "Campus Bus Terminal", Order: 1, Status: "DEPARTED", Time: "03:30 PM"},
				{Name: "Shiashie Flyover", Order: 2, Status: "DEPARTED", Time: "03:45 PM"},
				{Name: "Boundary Road Junction", Order: 3, Status: "NEXT", Time: "03:55 PM"},
				{Name: "A&C Square Roundabout", Order: 4, Status: "UPCOMING", Time: "04:05 PM"},
				{Name: "American House Terminal", Order: 5, Status: "UPCOMING", Time: "04:15 PM"},
			},
		}
		r2 := domain.TransportRoute{
			Name:                 "Route 2: Cantonments & Osu Shuttle",
			VehiclePlate:         "GW 9182-25",
			VehicleInfo:          "Mercedes Sprinter (22-Seater)",
			DriverName:           "Driver Emmanuel Darko",
			DriverPhone:          "+233 50 882 1199",
			Capacity:             22,
			IsActive:             true,
			DailyFee:             30.0,
			CurrentLat:           5.5780,
			CurrentLng:           -0.1802,
			SpeedKmh:             42.0,
			HeadingDeg:           180,
			NextStopName:         "Danquah Circle",
			EstimatedArrivalMins: 14,
			LastPingAt:           &now,
			Stops: []domain.RouteStop{
				{Name: "Campus Bus Terminal", Order: 1, Status: "DEPARTED", Time: "03:30 PM"},
				{Name: "Police Headquarters", Order: 2, Status: "DEPARTED", Time: "03:50 PM"},
				{Name: "Danquah Circle", Order: 3, Status: "NEXT", Time: "04:02 PM"},
				{Name: "Osu Oxford Street Stop", Order: 4, Status: "UPCOMING", Time: "04:12 PM"},
			},
		}
		_ = u.repo.CreateRoute(ctx, &r1)
		_ = u.repo.CreateRoute(ctx, &r2)
		return u.repo.GetRoutes(ctx)
	}
	return routes, nil
}

func (u *logisticsUseCase) GetRouteByID(ctx context.Context, id uuid.UUID) (*domain.TransportRoute, error) {
	return u.repo.GetRouteByID(ctx, id)
}

func (u *logisticsUseCase) AddRoute(ctx context.Context, route *domain.TransportRoute) error {
	return u.repo.CreateRoute(ctx, route)
}

func (u *logisticsUseCase) UpdateBusGPS(ctx context.Context, routeID uuid.UUID, lat, lng, speed, heading float64, nextStop string, eta int) error {
	return u.repo.UpdateRouteGPS(ctx, routeID, lat, lng, speed, heading, nextStop, eta)
}

func (u *logisticsUseCase) AssignStudentToBus(ctx context.Context, assignment *domain.BusAssignment) error {
	return u.repo.AssignBus(ctx, assignment)
}

func (u *logisticsUseCase) GetTransportForStudent(ctx context.Context, studentID uuid.UUID) (*domain.BusAssignment, error) {
	return u.repo.GetStudentTransport(ctx, studentID)
}

// Canteen
func (u *logisticsUseCase) GetAllMealPlans(ctx context.Context) ([]domain.MealPlan, error) {
	return u.repo.GetMealPlans(ctx)
}

func (u *logisticsUseCase) AddMealPlan(ctx context.Context, plan *domain.MealPlan) error {
	return u.repo.CreateMealPlan(ctx, plan)
}

func (u *logisticsUseCase) SubscribeStudent(ctx context.Context, sub *domain.CanteenSubscription) error {
	return u.repo.SubscribeToCanteen(ctx, sub)
}

func (u *logisticsUseCase) GetSubscriptionForStudent(ctx context.Context, studentID uuid.UUID) (*domain.CanteenSubscription, error) {
	return u.repo.GetStudentMealPlan(ctx, studentID)
}
