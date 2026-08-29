package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Hostel represents a boarding house or hall of residence
type Hostel struct {
	TenantBase
	ID          uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string       `json:"name" gorm:"type:varchar(100);not null"`
	Gender      string       `json:"gender" gorm:"type:varchar(20);not null"` // MALE, FEMALE, COED
	WardenName  string       `json:"warden_name"`
	WardenPhone string       `json:"warden_phone"`
	Capacity    int          `json:"capacity" gorm:"default:0"`
	Rooms       []HostelRoom `json:"rooms,omitempty" gorm:"foreignKey:HostelID"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// HostelRoom represents a dormitory room in a boarding house
type HostelRoom struct {
	TenantBase
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	HostelID     uuid.UUID `json:"hostel_id" gorm:"type:uuid;not null;index"`
	RoomNumber   string    `json:"room_number" gorm:"type:varchar(50);not null"`
	Floor        int       `json:"floor" gorm:"default:1"`
	Capacity     int       `json:"capacity" gorm:"not null"` // Total bed capacity
	BedsOccupied int       `json:"beds_occupied" gorm:"default:0"`
	CreatedAt    time.Time `json:"created_at"`
}

// BedAllocation records student boarding assignments
type BedAllocation struct {
	TenantBase
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	HostelID    uuid.UUID   `json:"hostel_id" gorm:"type:uuid;not null;index"`
	RoomID      uuid.UUID   `json:"room_id" gorm:"type:uuid;not null;index"`
	Room        *HostelRoom `json:"room,omitempty" gorm:"foreignKey:RoomID"`
	StudentID   uuid.UUID   `json:"student_id" gorm:"type:uuid;not null;uniqueIndex:idx_tenant_student_bed"`
	Student     *Student    `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	BedNumber   string      `json:"bed_number"` // e.g. "Bed 3 - Upper Bunk"
	AllocatedAt time.Time   `json:"allocated_at"`
	VacatedAt   *time.Time  `json:"vacated_at"`
}

type HostelRepository interface {
	GetHostels(ctx context.Context) ([]Hostel, error)
	CreateHostel(ctx context.Context, hostel *Hostel) error
	GetHostelByID(ctx context.Context, id uuid.UUID) (*Hostel, error)
	CreateRoom(ctx context.Context, room *HostelRoom) error
	GetRoomsByHostel(ctx context.Context, hostelID uuid.UUID) ([]HostelRoom, error)
	AllocateBed(ctx context.Context, allocation *BedAllocation) error
	GetStudentBedAllocation(ctx context.Context, studentID uuid.UUID) (*BedAllocation, error)
	VacateBed(ctx context.Context, studentID uuid.UUID) error
}

type HostelUseCase interface {
	GetAllHostels(ctx context.Context) ([]Hostel, error)
	CreateHostel(ctx context.Context, hostel *Hostel) error
	AddRoom(ctx context.Context, room *HostelRoom) error
	GetRooms(ctx context.Context, hostelID uuid.UUID) ([]HostelRoom, error)
	AllocateStudent(ctx context.Context, hostelID, roomID, studentID uuid.UUID, bedNumber string) error
	GetStudentAllocation(ctx context.Context, studentID uuid.UUID) (*BedAllocation, error)
	VacateStudent(ctx context.Context, studentID uuid.UUID) error
}
