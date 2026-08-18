package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/domain"
)

type logisticsRepository struct {
	db *gorm.DB
}

func NewLogisticsRepository(db *gorm.DB) domain.LogisticsRepository {
	return &logisticsRepository{db: db}
}

// Transport
func (r *logisticsRepository) GetRoutes(ctx context.Context) ([]domain.TransportRoute, error) {
	var routes []domain.TransportRoute
	if err := r.db.WithContext(ctx).Find(&routes).Error; err != nil {
		return nil, err
	}
	return routes, nil
}

func (r *logisticsRepository) CreateRoute(ctx context.Context, route *domain.TransportRoute) error {
	return r.db.WithContext(ctx).Create(route).Error
}

func (r *logisticsRepository) AssignBus(ctx context.Context, assignment *domain.BusAssignment) error {
	// First check if an assignment already exists and update it, else create
	var existing domain.BusAssignment
	err := r.db.WithContext(ctx).Where("student_id = ?", assignment.StudentID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.WithContext(ctx).Create(assignment).Error
		}
		return err
	}
	assignment.ID = existing.ID
	return r.db.WithContext(ctx).Save(assignment).Error
}

func (r *logisticsRepository) GetStudentTransport(ctx context.Context, studentID uuid.UUID) (*domain.BusAssignment, error) {
	var assignment domain.BusAssignment
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).First(&assignment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &assignment, nil
}

func (r *logisticsRepository) GetAssignmentsByRoute(ctx context.Context, routeID uuid.UUID) ([]domain.BusAssignment, error) {
	var assignments []domain.BusAssignment
	if err := r.db.WithContext(ctx).Preload("Student").Where("route_id = ?", routeID).Find(&assignments).Error; err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *logisticsRepository) GetStudentsWithoutRoute(ctx context.Context) ([]domain.Student, error) {
	var students []domain.Student
	// Find active students who do not have a bus assignment
	err := r.db.WithContext(ctx).
		Where("status = ?", domain.StatusActive).
		Where("id NOT IN (SELECT student_id FROM bus_assignments)").
		Find(&students).Error
	if err != nil {
		return nil, err
	}
	return students, nil
}

// Canteen
func (r *logisticsRepository) GetMealPlans(ctx context.Context) ([]domain.MealPlan, error) {
	var plans []domain.MealPlan
	if err := r.db.WithContext(ctx).Find(&plans).Error; err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *logisticsRepository) CreateMealPlan(ctx context.Context, plan *domain.MealPlan) error {
	return r.db.WithContext(ctx).Create(plan).Error
}

func (r *logisticsRepository) SubscribeToCanteen(ctx context.Context, sub *domain.CanteenSubscription) error {
	var existing domain.CanteenSubscription
	err := r.db.WithContext(ctx).Where("student_id = ?", sub.StudentID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.WithContext(ctx).Create(sub).Error
		}
		return err
	}
	sub.ID = existing.ID
	return r.db.WithContext(ctx).Save(sub).Error
}

func (r *logisticsRepository) GetStudentMealPlan(ctx context.Context, studentID uuid.UUID) (*domain.CanteenSubscription, error) {
	var sub domain.CanteenSubscription
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).First(&sub).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &sub, nil
}
