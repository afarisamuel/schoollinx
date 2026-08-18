package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// House represents a school house (e.g., Volta, Densu, Ankobra, Pra)
type House struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"type:varchar(100);not null;uniqueIndex:idx_tenant_house"`
	Color       string    `json:"color" gorm:"type:varchar(20);not null"`  // Hex color e.g. "#6366F1"
	Crest       string    `json:"crest" gorm:"type:text"`                  // SVG path or emoji
	Description string    `json:"description" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Computed / aggregated — not stored
	TotalPoints int64  `json:"total_points" gorm:"-"`
	MemberCount int64  `json:"member_count" gorm:"-"`
	Rank        int    `json:"rank" gorm:"-"`
}

// HouseMember links a student to their house
type HouseMember struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	HouseID   uuid.UUID `json:"house_id" gorm:"type:uuid;not null;index"`
	StudentID uuid.UUID `json:"student_id" gorm:"type:uuid;not null;uniqueIndex:idx_tenant_student_house"`
	JoinedAt  time.Time `json:"joined_at" gorm:"autoCreateTime"`
}

// HousePointEntry is a single point award (tied to a BehaviorLog)
type HousePointEntry struct {
	TenantBase
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	HouseID       uuid.UUID `json:"house_id" gorm:"type:uuid;not null;index"`
	StudentID     uuid.UUID `json:"student_id" gorm:"type:uuid;not null"`
	BehaviorLogID uuid.UUID `json:"behavior_log_id" gorm:"type:uuid;not null"`
	Points        int       `json:"points" gorm:"not null"` // Positive = Merit, Negative = Demerit
	AwardedAt     time.Time `json:"awarded_at" gorm:"autoCreateTime"`
}

type HouseRepository interface {
	// Houses
	Create(ctx context.Context, house *House) error
	GetAll(ctx context.Context) ([]House, error)
	GetByID(ctx context.Context, id uuid.UUID) (*House, error)
	Update(ctx context.Context, house *House) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Membership
	AssignStudent(ctx context.Context, member *HouseMember) error
	GetStudentHouse(ctx context.Context, studentID uuid.UUID) (*House, error)
	GetHouseMembers(ctx context.Context, houseID uuid.UUID) ([]HouseMember, error)
	RemoveStudent(ctx context.Context, studentID uuid.UUID) error

	// Points
	AddPoints(ctx context.Context, entry *HousePointEntry) error
	GetLeaderboard(ctx context.Context) ([]House, error) // Returns houses sorted by TotalPoints desc
	GetHousePoints(ctx context.Context, houseID uuid.UUID) (int64, error)
}

type HouseUseCase interface {
	// Management
	CreateHouse(ctx context.Context, house *House) error
	GetAllHouses(ctx context.Context) ([]House, error)
	UpdateHouse(ctx context.Context, house *House) error
	DeleteHouse(ctx context.Context, id uuid.UUID) error

	// Leaderboard
	GetLeaderboard(ctx context.Context) ([]House, error)

	// Assignment
	AssignStudentToHouse(ctx context.Context, studentID, houseID uuid.UUID) error
	GetStudentHouse(ctx context.Context, studentID uuid.UUID) (*House, error)
}
