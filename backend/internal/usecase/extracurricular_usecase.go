package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type extracurricularUseCase struct {
	repo          domain.ExtracurricularRepository
	timetableRepo domain.TimetableRepository
}

func NewExtracurricularUseCase(repo domain.ExtracurricularRepository, timetableRepo domain.TimetableRepository) domain.ExtracurricularUseCase {
	return &extracurricularUseCase{
		repo:          repo,
		timetableRepo: timetableRepo,
	}
}

func (u *extracurricularUseCase) CreateClub(ctx context.Context, club *domain.Club) error {
	if club.ID == uuid.Nil {
		club.ID = uuid.New()
	}
	if club.CreatedAt.IsZero() {
		club.CreatedAt = time.Now()
	}
	return u.repo.CreateClub(ctx, club)
}

func (u *extracurricularUseCase) ListClubs(ctx context.Context) ([]domain.Club, error) {
	return u.repo.GetAllClubs(ctx)
}

func (u *extracurricularUseCase) GetStudentClubs(ctx context.Context, studentID uuid.UUID) ([]domain.Club, error) {
	return u.repo.GetStudentClubs(ctx, studentID)
}

func (u *extracurricularUseCase) JoinClub(ctx context.Context, clubID, studentID uuid.UUID) error {
	member := &domain.ClubMember{
		ClubID:    clubID,
		StudentID: studentID,
	}
	return u.repo.AddMember(ctx, member)
}

func (u *extracurricularUseCase) LeaveClub(ctx context.Context, clubID, studentID uuid.UUID) error {
	return u.repo.RemoveMember(ctx, clubID, studentID)
}

func (u *extracurricularUseCase) ListEvents(ctx context.Context, start, end time.Time) ([]domain.Event, error) {
	return u.repo.GetEvents(ctx, start, end)
}

func (u *extracurricularUseCase) ScheduleEvent(ctx context.Context, event *domain.Event) error {
	// 1. Basic validation
	if event.StartTime.After(event.EndTime) || event.StartTime.Equal(event.EndTime) {
		return errors.New("event start time must be before end time")
	}

	// 2. Integration: Check for room conflicts in Timetable if location matches a room
	// For now, we reuse the GetByOverlap logic from the timetable
	dayOfWeek := int(event.StartTime.Weekday())
	if dayOfWeek == 0 {
		dayOfWeek = 7
	} // Sunday

	overlaps, err := u.timetableRepo.GetByOverlap(ctx, dayOfWeek, event.StartTime.Format("15:04"), event.EndTime.Format("15:04"))
	if err == nil {
		for _, entry := range overlaps {
			if entry.Room == event.Location && event.Location != "" {
				return errors.New("location is already occupied by an academic class during this time")
			}
		}
	}

	return u.repo.CreateEvent(ctx, event)
}
