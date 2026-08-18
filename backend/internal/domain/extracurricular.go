package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ClubCategory string

const (
	CategorySports   ClubCategory = "SPORTS"
	CategoryArts     ClubCategory = "ARTS"
	CategoryAcademic ClubCategory = "ACADEMIC"
	CategorySocial   ClubCategory = "SOCIAL"
)

type Club struct {
	TenantBase
	ID          uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string       `json:"name" gorm:"not null"`
	Description string       `json:"description"`
	TeacherID   uuid.UUID    `json:"teacher_id" gorm:"type:uuid;not null"`
	Category    ClubCategory `json:"category" gorm:"not null"`
	CreatedAt   time.Time    `json:"created_at"`
}

func (c *Club) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

type ClubMember struct {
	TenantBase
	ClubID    uuid.UUID `json:"club_id" gorm:"type:uuid;primaryKey"`
	StudentID uuid.UUID `json:"student_id" gorm:"type:uuid;primaryKey"`
	JoinedAt  time.Time `json:"joined_at"`
}

type Event struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"start_time" gorm:"not null"`
	EndTime     time.Time `json:"end_time" gorm:"not null"`
	Location    string    `json:"location"`
	ClubID      uuid.UUID `json:"club_id" gorm:"type:uuid"`
	CreatedAt   time.Time `json:"created_at"`
}

func (e *Event) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

type ExtracurricularRepository interface {
	CreateClub(ctx context.Context, club *Club) error
	GetAllClubs(ctx context.Context) ([]Club, error)
	GetClubByID(ctx context.Context, id uuid.UUID) (*Club, error)

	AddMember(ctx context.Context, member *ClubMember) error
	RemoveMember(ctx context.Context, clubID, studentID uuid.UUID) error
	GetClubMembers(ctx context.Context, clubID uuid.UUID) ([]uuid.UUID, error)
	GetStudentClubs(ctx context.Context, studentID uuid.UUID) ([]Club, error)

	CreateEvent(ctx context.Context, event *Event) error
	GetEvents(ctx context.Context, start, end time.Time) ([]Event, error)
}

type ExtracurricularUseCase interface {
	ListClubs(ctx context.Context) ([]Club, error)
	GetStudentClubs(ctx context.Context, studentID uuid.UUID) ([]Club, error)
	JoinClub(ctx context.Context, clubID, studentID uuid.UUID) error
	LeaveClub(ctx context.Context, clubID, studentID uuid.UUID) error
	ListEvents(ctx context.Context, start, end time.Time) ([]Event, error)
	ScheduleEvent(ctx context.Context, event *Event) error
}
