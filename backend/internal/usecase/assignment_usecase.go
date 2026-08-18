package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type assignmentUseCase struct {
	assignmentRepo domain.AssignmentRepository
}

func NewAssignmentUseCase(repo domain.AssignmentRepository) domain.AssignmentUseCase {
	return &assignmentUseCase{assignmentRepo: repo}
}

func (u *assignmentUseCase) AssignTeacherToSubject(ctx context.Context, teacherID, classID, subjectID uuid.UUID) error {
	assignment := &domain.AcademicAssignment{
		TeacherID: teacherID,
		ClassID:   classID,
		SubjectID: subjectID,
	}
	return u.assignmentRepo.Create(ctx, assignment)
}

func (u *assignmentUseCase) GetAssignmentsByClass(ctx context.Context, classID uuid.UUID) ([]domain.AcademicAssignment, error) {
	return u.assignmentRepo.GetByClass(ctx, classID)
}

func (u *assignmentUseCase) GetAssignmentsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.AcademicAssignment, error) {
	return u.assignmentRepo.GetByTeacher(ctx, teacherID)
}

func (u *assignmentUseCase) RemoveAssignment(ctx context.Context, id uuid.UUID) error {
	return u.assignmentRepo.Delete(ctx, id)
}
