package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type gradeUseCase struct {
	gradeRepo domain.GradeRepository
	notifUC   domain.NotificationUseCase
}

func NewGradeUseCase(repo domain.GradeRepository, notifUC domain.NotificationUseCase) domain.GradeUseCase {
	return &gradeUseCase{gradeRepo: repo, notifUC: notifUC}
}

func (u *gradeUseCase) AddGrade(ctx context.Context, grade *domain.Grade) error {
	err := u.gradeRepo.Create(ctx, grade)
	if err == nil && u.notifUC != nil && grade.StudentID != uuid.Nil {
		_ = u.notifUC.SendToUser(grade.StudentID, domain.Notification{
			Type:    domain.NotificationGrade,
			Title:   "New Grade Posted",
			Message: "A new grade has been posted for your subject.",
		})
	}
	return err
}

func (u *gradeUseCase) GetStudentGrades(ctx context.Context, studentID uuid.UUID) ([]domain.Grade, error) {
	return u.gradeRepo.GetByStudentID(ctx, studentID)
}

func (u *gradeUseCase) GetClassGrades(ctx context.Context, classID uuid.UUID) ([]domain.Grade, error) {
	return u.gradeRepo.GetByClassID(ctx, classID)
}

func (u *gradeUseCase) UpdateGrade(ctx context.Context, grade *domain.Grade) error {
	return u.gradeRepo.Update(ctx, grade)
}

func (u *gradeUseCase) DeleteGrade(ctx context.Context, id uuid.UUID) error {
	return u.gradeRepo.Delete(ctx, id)
}

func (u *gradeUseCase) BulkCreateGrades(ctx context.Context, grades []domain.Grade) (int, []string, error) {
	return u.gradeRepo.BulkCreate(ctx, grades)
}

func (u *gradeUseCase) GetWeightsByClassID(ctx context.Context, classID uuid.UUID) ([]domain.GradeWeight, error) {
	return u.gradeRepo.GetWeightsByClassID(ctx, classID)
}

func (u *gradeUseCase) GetGeneralWeights(ctx context.Context) ([]domain.GradeWeight, error) {
	return u.gradeRepo.GetGeneralWeights(ctx)
}

func (u *gradeUseCase) UpsertWeight(ctx context.Context, w *domain.GradeWeight) error {
	return u.gradeRepo.UpsertWeight(ctx, w)
}

func (u *gradeUseCase) UpdateWeights(ctx context.Context, classID *uuid.UUID, weights []domain.GradeWeight) error {
	return u.gradeRepo.ReplaceWeights(ctx, classID, weights)
}

func (u *gradeUseCase) DeleteWeightsByClassID(ctx context.Context, classID uuid.UUID) error {
	return u.gradeRepo.DeleteWeightsByClassID(ctx, classID)
}

func (u *gradeUseCase) GetStudentGradeTrajectory(ctx context.Context, studentID uuid.UUID) ([]domain.GradeTrajectoryPoint, error) {
	return u.gradeRepo.GetStudentGradeTrajectory(ctx, studentID)
}
