package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type hostelUseCase struct {
	hostelRepo  domain.HostelRepository
	studentRepo domain.StudentRepository
}

func NewHostelUseCase(hostelRepo domain.HostelRepository, studentRepo domain.StudentRepository) domain.HostelUseCase {
	return &hostelUseCase{
		hostelRepo:  hostelRepo,
		studentRepo: studentRepo,
	}
}

func (u *hostelUseCase) GetAllHostels(ctx context.Context) ([]domain.Hostel, error) {
	return u.hostelRepo.GetHostels(ctx)
}

func (u *hostelUseCase) CreateHostel(ctx context.Context, hostel *domain.Hostel) error {
	return u.hostelRepo.CreateHostel(ctx, hostel)
}

func (u *hostelUseCase) AddRoom(ctx context.Context, room *domain.HostelRoom) error {
	return u.hostelRepo.CreateRoom(ctx, room)
}

func (u *hostelUseCase) GetRooms(ctx context.Context, hostelID uuid.UUID) ([]domain.HostelRoom, error) {
	return u.hostelRepo.GetRoomsByHostel(ctx, hostelID)
}

func (u *hostelUseCase) AllocateStudent(ctx context.Context, hostelID, roomID, studentID uuid.UUID, bedNumber string) error {
	// Check if already allocated an active bed
	existing, _ := u.hostelRepo.GetStudentBedAllocation(ctx, studentID)
	if existing != nil {
		return fmt.Errorf("student is already assigned to a room (%s). Please vacate first", existing.BedNumber)
	}

	// Verify room capacity
	rooms, err := u.hostelRepo.GetRoomsByHostel(ctx, hostelID)
	if err != nil {
		return err
	}
	var targetRoom *domain.HostelRoom
	for _, r := range rooms {
		if r.ID == roomID {
			targetRoom = &r
			break
		}
	}
	if targetRoom == nil {
		return errors.New("room not found in selected hostel")
	}
	if targetRoom.BedsOccupied >= targetRoom.Capacity {
		return errors.New("room has reached maximum bed capacity")
	}

	alloc := &domain.BedAllocation{
		HostelID:    hostelID,
		RoomID:      roomID,
		StudentID:   studentID,
		BedNumber:   bedNumber,
		AllocatedAt: time.Now(),
	}

	return u.hostelRepo.AllocateBed(ctx, alloc)
}

func (u *hostelUseCase) GetStudentAllocation(ctx context.Context, studentID uuid.UUID) (*domain.BedAllocation, error) {
	return u.hostelRepo.GetStudentBedAllocation(ctx, studentID)
}

func (u *hostelUseCase) VacateStudent(ctx context.Context, studentID uuid.UUID) error {
	return u.hostelRepo.VacateBed(ctx, studentID)
}
