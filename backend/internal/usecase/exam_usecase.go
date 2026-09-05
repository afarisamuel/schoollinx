package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type examUseCase struct {
	repo domain.ExamRepository
}

func NewExamUseCase(repo domain.ExamRepository) domain.ExamUseCase {
	return &examUseCase{repo: repo}
}

func (u *examUseCase) CreateExam(ctx context.Context, exam *domain.Exam) error {
	return u.repo.CreateExam(ctx, exam)
}

func (u *examUseCase) GetExams(ctx context.Context) ([]domain.Exam, error) {
	return u.repo.GetExams(ctx)
}

func (u *examUseCase) GetExamByID(ctx context.Context, id uuid.UUID) (*domain.Exam, error) {
	return u.repo.GetExamByID(ctx, id)
}

func (u *examUseCase) UpdateExam(ctx context.Context, exam *domain.Exam) error {
	return u.repo.UpdateExam(ctx, exam)
}

func (u *examUseCase) DeleteExam(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteExam(ctx, id)
}

func (u *examUseCase) AddSchedule(ctx context.Context, schedule *domain.ExamSchedule) error {
	return u.repo.CreateSchedule(ctx, schedule)
}

func (u *examUseCase) DeleteSchedule(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteSchedule(ctx, id)
}

func (u *examUseCase) GetExamSchedules(ctx context.Context, examID uuid.UUID) ([]domain.ExamSchedule, error) {
	return u.repo.GetSchedulesByExam(ctx, examID)
}

func (u *examUseCase) SubmitResults(ctx context.Context, scheduleID uuid.UUID, results []domain.ExamResult) error {
	return u.repo.SaveResults(ctx, scheduleID, results)
}

func (u *examUseCase) GetScheduleResults(ctx context.Context, scheduleID uuid.UUID) ([]domain.ExamResult, error) {
	return u.repo.GetResultsBySchedule(ctx, scheduleID)
}

func (u *examUseCase) CheckConflicts(ctx context.Context, examID uuid.UUID) ([]domain.ExamConflict, error) {
	schedules, err := u.repo.GetSchedulesByExam(ctx, examID)
	if err != nil {
		return nil, err
	}

	var conflicts []domain.ExamConflict
	n := len(schedules)

	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			s1 := schedules[i]
			s2 := schedules[j]

			// Check same calendar day
			if s1.Date.Format("2006-01-02") != s2.Date.Format("2006-01-02") {
				continue
			}

			// Check time overlap: overlap occurs unless one ends before or at start of other
			hasOverlap := !(s1.EndTime <= s2.StartTime || s2.EndTime <= s1.StartTime)
			if !hasOverlap {
				continue
			}

			// 1. Same class scheduled for two exams concurrently
			if s1.ClassID == s2.ClassID {
				conflicts = append(conflicts, domain.ExamConflict{
					Type:        "CLASS_DOUBLE_BOOKING",
					Date:        s1.Date,
					StartTime:   s1.StartTime,
					EndTime:     s1.EndTime,
					ScheduleA:   s1.ID,
					ScheduleB:   s2.ID,
					Description: "Class has simultaneous exams scheduled for " + s1.Subject + " and " + s2.Subject,
				})
			}

			// 2. Same room double-booked
			if s1.Room != "" && s1.Room == s2.Room {
				conflicts = append(conflicts, domain.ExamConflict{
					Type:        "ROOM_CONFLICT",
					Date:        s1.Date,
					StartTime:   s1.StartTime,
					EndTime:     s1.EndTime,
					ScheduleA:   s1.ID,
					ScheduleB:   s2.ID,
					Description: "Room " + s1.Room + " is simultaneously reserved for " + s1.Subject + " and " + s2.Subject,
				})
			}

			// 3. Invigilator overlap
			if s1.InvigilatorID != nil && s2.InvigilatorID != nil && *s1.InvigilatorID == *s2.InvigilatorID {
				conflicts = append(conflicts, domain.ExamConflict{
					Type:        "INVIGILATOR_CONFLICT",
					Date:        s1.Date,
					StartTime:   s1.StartTime,
					EndTime:     s1.EndTime,
					ScheduleA:   s1.ID,
					ScheduleB:   s2.ID,
					Description: "Invigilator is assigned to two concurrent exam halls",
				})
			}
		}
	}

	return conflicts, nil
}

