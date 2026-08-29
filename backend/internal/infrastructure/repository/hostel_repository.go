package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/domain"
)

type hostelRepository struct {
	db *gorm.DB
}

func NewHostelRepository(db *gorm.DB) domain.HostelRepository {
	return &hostelRepository{db: db}
}

func (r *hostelRepository) GetHostels(ctx context.Context) ([]domain.Hostel, error) {
	var hostels []domain.Hostel
	err := r.db.WithContext(ctx).Preload("Rooms").Order("name ASC").Find(&hostels).Error
	return hostels, err
}

func (r *hostelRepository) CreateHostel(ctx context.Context, hostel *domain.Hostel) error {
	if hostel.ID == uuid.Nil {
		hostel.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(hostel).Error
}

func (r *hostelRepository) GetHostelByID(ctx context.Context, id uuid.UUID) (*domain.Hostel, error) {
	var hostel domain.Hostel
	err := r.db.WithContext(ctx).Preload("Rooms").Where("id = ?", id).First(&hostel).Error
	if err != nil {
		return nil, err
	}
	return &hostel, nil
}

func (r *hostelRepository) CreateRoom(ctx context.Context, room *domain.HostelRoom) error {
	if room.ID == uuid.Nil {
		room.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *hostelRepository) GetRoomsByHostel(ctx context.Context, hostelID uuid.UUID) ([]domain.HostelRoom, error) {
	var rooms []domain.HostelRoom
	err := r.db.WithContext(ctx).Where("hostel_id = ?", hostelID).Order("room_number ASC").Find(&rooms).Error
	return rooms, err
}

func (r *hostelRepository) AllocateBed(ctx context.Context, allocation *domain.BedAllocation) error {
	if allocation.ID == uuid.Nil {
		allocation.ID = uuid.New()
	}
	if allocation.AllocatedAt.IsZero() {
		allocation.AllocatedAt = time.Now()
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Increment occupied beds count in room
		if err := tx.Model(&domain.HostelRoom{}).Where("id = ?", allocation.RoomID).
			UpdateColumn("beds_occupied", gorm.Expr("beds_occupied + 1")).Error; err != nil {
			return err
		}
		return tx.Create(allocation).Error
	})
}

func (r *hostelRepository) GetStudentBedAllocation(ctx context.Context, studentID uuid.UUID) (*domain.BedAllocation, error) {
	var alloc domain.BedAllocation
	err := r.db.WithContext(ctx).
		Preload("Room").
		Preload("Student").
		Where("student_id = ? AND vacated_at IS NULL", studentID).
		First(&alloc).Error
	if err != nil {
		return nil, err
	}
	return &alloc, nil
}

func (r *hostelRepository) VacateBed(ctx context.Context, studentID uuid.UUID) error {
	now := time.Now()
	var alloc domain.BedAllocation
	if err := r.db.WithContext(ctx).Where("student_id = ? AND vacated_at IS NULL", studentID).First(&alloc).Error; err != nil {
		return err
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&alloc).Update("vacated_at", &now).Error; err != nil {
			return err
		}
		return tx.Model(&domain.HostelRoom{}).Where("id = ? AND beds_occupied > 0", alloc.RoomID).
			UpdateColumn("beds_occupied", gorm.Expr("beds_occupied - 1")).Error
	})
}
