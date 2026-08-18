package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type facilityUseCase struct {
	repo domain.FacilityRepository
}

func NewFacilityUseCase(repo domain.FacilityRepository) domain.FacilityUseCase {
	return &facilityUseCase{repo: repo}
}

// Inventory
func (u *facilityUseCase) GetAllInventory(ctx context.Context) ([]domain.InventoryItem, error) {
	return u.repo.GetInventoryItems(ctx)
}

func (u *facilityUseCase) AddInventoryItem(ctx context.Context, item *domain.InventoryItem) error {
	return u.repo.CreateInventoryItem(ctx, item)
}

func (u *facilityUseCase) AdjustInventory(ctx context.Context, id uuid.UUID, quantity int) error {
	return u.repo.UpdateInventoryQuantity(ctx, id, quantity)
}

func (u *facilityUseCase) RemoveInventoryItem(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteInventoryItem(ctx, id)
}

// Visitors
func (u *facilityUseCase) GetDailyVisitors(ctx context.Context, date time.Time) ([]domain.VisitorLog, error) {
	return u.repo.GetVisitorLogs(ctx, date)
}

func (u *facilityUseCase) RegisterVisitor(ctx context.Context, log *domain.VisitorLog) error {
	return u.repo.CheckInVisitor(ctx, log)
}

func (u *facilityUseCase) SignOutVisitor(ctx context.Context, id uuid.UUID) error {
	return u.repo.CheckOutVisitor(ctx, id, time.Now())
}

func (u *facilityUseCase) UpdateAsset(ctx context.Context, item *domain.InventoryItem) error {
	return u.repo.UpdateInventoryItem(ctx, item)
}

// Rooms & Bookings
func (u *facilityUseCase) GetAllRooms(ctx context.Context) ([]domain.Room, error) {
	return u.repo.GetRooms(ctx)
}

func (u *facilityUseCase) AddRoom(ctx context.Context, room *domain.Room) error {
	return u.repo.CreateRoom(ctx, room)
}

func (u *facilityUseCase) BookRoom(ctx context.Context, booking *domain.RoomBooking) error {
	available, err := u.repo.CheckRoomAvailability(ctx, booking.RoomID, booking.StartTime, booking.EndTime)
	if err != nil {
		return err
	}
	if !available {
		return fmt.Errorf("room is already booked for that time slot")
	}
	return u.repo.CreateRoomBooking(ctx, booking)
}

func (u *facilityUseCase) CancelBooking(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteRoomBooking(ctx, id)
}

func (u *facilityUseCase) GetRoomSchedule(ctx context.Context, roomID uuid.UUID, date time.Time) ([]domain.RoomBooking, error) {
	return u.repo.GetRoomBookings(ctx, roomID, date)
}

// Usage & Heatmap
func (u *facilityUseCase) LogFacilityUsage(ctx context.Context, log *domain.FacilityUsageLog) error {
	return u.repo.LogFacilityUsage(ctx, log)
}

func (u *facilityUseCase) GetResourceHeatmap(ctx context.Context) ([]domain.ResourceHeatmap, error) {
	return u.repo.GetResourceHeatmap(ctx)
}
