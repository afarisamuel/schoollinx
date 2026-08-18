package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type homeworkUseCase struct {
	repo domain.HomeworkRepository
}

func NewHomeworkUseCase(repo domain.HomeworkRepository) domain.HomeworkUseCase {
	return &homeworkUseCase{repo: repo}
}

func (u *homeworkUseCase) CreateHomework(ctx context.Context, homework *domain.Homework) error {
	return u.repo.Create(ctx, homework)
}

func (u *homeworkUseCase) GetHomeworkByID(ctx context.Context, id uuid.UUID) (*domain.Homework, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *homeworkUseCase) GetHomeworksByClass(ctx context.Context, classID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByClass(ctx, classID)
}

func (u *homeworkUseCase) GetHomeworksByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByTeacher(ctx, teacherID)
}

func (u *homeworkUseCase) UpdateHomework(ctx context.Context, homework *domain.Homework) error {
	return u.repo.Update(ctx, homework)
}

func (u *homeworkUseCase) DeleteHomework(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

func (u *homeworkUseCase) GetHomework(ctx context.Context, id uuid.UUID) (*domain.Homework, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *homeworkUseCase) GetClassHomework(ctx context.Context, classID uuid.UUID) ([]domain.Homework, error) {
	return u.repo.GetByClass(ctx, classID)
}

func (u *homeworkUseCase) SubmitAssignment(ctx context.Context, submission *domain.HomeworkSubmission) error {
	return u.repo.SubmitHomework(ctx, submission)
}

func (u *homeworkUseCase) GradeAssignment(ctx context.Context, submissionID uuid.UUID, score float64, feedback string) error {
	return u.repo.GradeSubmission(ctx, submissionID, score, feedback)
}

func (u *homeworkUseCase) GetStudentSubmission(ctx context.Context, homeworkID, studentID uuid.UUID) (*domain.HomeworkSubmission, error) {
	return u.repo.GetSubmission(ctx, homeworkID, studentID)
}

func (u *homeworkUseCase) GetHomeworkSubmissions(ctx context.Context, homeworkID uuid.UUID) ([]domain.HomeworkSubmission, error) {
	return u.repo.GetSubmissionsForHomework(ctx, homeworkID)
}
