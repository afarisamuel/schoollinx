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

func (u *examUseCase) AddSchedule(ctx context.Context, schedule *domain.ExamSchedule) error {
	return u.repo.CreateSchedule(ctx, schedule)
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
