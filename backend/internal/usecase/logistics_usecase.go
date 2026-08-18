package usecase

import (
	"context"

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
	return u.repo.GetRoutes(ctx)
}

func (u *logisticsUseCase) AddRoute(ctx context.Context, route *domain.TransportRoute) error {
	return u.repo.CreateRoute(ctx, route)
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
