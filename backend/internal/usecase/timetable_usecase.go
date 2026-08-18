package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type TimetableUseCase struct {
	repo           domain.TimetableRepository
	assignmentRepo domain.AssignmentRepository
}

func NewTimetableUseCase(repo domain.TimetableRepository, assignmentRepo domain.AssignmentRepository) *TimetableUseCase {
	return &TimetableUseCase{
		repo:           repo,
		assignmentRepo: assignmentRepo,
	}
}

func (u *TimetableUseCase) AddEntry(ctx context.Context, entry *domain.TimetableEntry) error {
	// 1. Fetch all overlapping entries for that day/time
	overlaps, err := u.repo.GetByOverlap(ctx, entry.DayOfWeek, entry.StartTime, entry.EndTime)
	if err != nil {
		return err
	}

	// 1.5 Academic Alignment Check (Intelligence Upgrade)
	assignments, err := u.assignmentRepo.GetByClass(ctx, entry.ClassID) // Using context correctly
	if err == nil {
		valid := false
		for _, a := range assignments {
			if a.TeacherID == entry.TeacherID && a.SubjectID == entry.SubjectID {
				valid = true
				break
			}
		}
		if !valid && len(assignments) > 0 {
			return domain.NewAppError(409, domain.ErrCodeConflict, "Pedagogical Error: Teacher is not assigned to this Subject for this Class")
		}
	}

	// 2. Check for specific conflicts
	for _, existing := range overlaps {
		if existing.TeacherID == entry.TeacherID {
			return domain.NewAppError(409, domain.ErrCodeConflict, "Teacher is already scheduled for this time slot")
		}
		if existing.Room == entry.Room && entry.Room != "" {
			return domain.NewAppError(409, domain.ErrCodeConflict, "Room is already occupied for this time slot")
		}
		if existing.ClassID == entry.ClassID {
			return domain.NewAppError(409, domain.ErrCodeConflict, "Class already has another subject scheduled for this time slot")
		}
	}
	// Assuming the AddEntry function should end here if no conflicts are found,
	// and the actual addition logic is missing or handled elsewhere.
	// For now, we just close the function.
	return u.repo.Create(ctx, entry)
}

func (u *TimetableUseCase) GetClassTimetable(ctx context.Context, classID uuid.UUID) ([]domain.TimetableEntry, error) {
	return u.repo.GetByClass(ctx, classID)
}

func (u *TimetableUseCase) RemoveEntry(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

// (Removed simple conflictError as we now use AppError)

func (u *TimetableUseCase) AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error {
	return u.repo.AutoGenerateExamSchedule(ctx, academicPeriodID)
}

func (u *TimetableUseCase) GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]domain.ExamSession, error) {
	return u.repo.GetExamSchedule(ctx, classID)
}
