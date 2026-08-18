package usecase

import (
	"context"
	"errors"
	"mime/multipart"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/repository"
)

type teacherPortalUseCase struct {
	teacherRepo domain.TeacherRepository
	studentRepo domain.StudentRepository
	gradeRepo   domain.GradeRepository
	classRepo   domain.ClassRepository
	subjectRepo domain.SubjectRepository
}

func NewTeacherPortalUseCase(
	teacherRepo domain.TeacherRepository,
	studentRepo domain.StudentRepository,
	gradeRepo domain.GradeRepository,
	classRepo domain.ClassRepository,
	subjectRepo domain.SubjectRepository,
) domain.TeacherPortalUseCase {
	return &teacherPortalUseCase{
		teacherRepo: teacherRepo,
		studentRepo: studentRepo,
		gradeRepo:   gradeRepo,
		classRepo:   classRepo,
		subjectRepo: subjectRepo,
	}
}

func (u *teacherPortalUseCase) GetMyClasses(ctx context.Context, userID uuid.UUID) (*domain.Teacher, []domain.TeacherClassAssignment, error) {
	teacher, err := u.teacherRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	assignments, err := u.teacherRepo.GetAssignments(ctx, teacher.ID)
	if err != nil {
		return nil, nil, err
	}

	var expanded []domain.TeacherClassAssignment
	for _, a := range assignments {
		if a.SubjectID == nil {
			// Class Teacher: explode into all subjects
			subjects, _ := u.subjectRepo.GetAll(ctx)
			for i := range subjects {
				s := subjects[i] // local copy
				newAssign := a
				newAssign.ID = uuid.New() // prevent ID collisions on frontend keys
				newAssign.SubjectID = &s.ID
				newAssign.Subject = &s
				expanded = append(expanded, newAssign)
			}
		} else {
			expanded = append(expanded, a)
		}
	}

	return teacher, expanded, nil
}

func (u *teacherPortalUseCase) GetClassStudents(ctx context.Context, classID uuid.UUID) ([]domain.Student, error) {
	return u.studentRepo.GetByClass(ctx, classID)
}

func (u *teacherPortalUseCase) GetClassGrades(ctx context.Context, classID uuid.UUID) ([]domain.Grade, error) {
	return u.gradeRepo.GetByClassID(ctx, classID)
}

func (u *teacherPortalUseCase) GetClassWeights(ctx context.Context, classID uuid.UUID) ([]domain.GradeWeight, error) {
	return u.gradeRepo.GetWeightsByClassID(ctx, classID)
}

func (u *teacherPortalUseCase) UpdateClassWeights(ctx context.Context, classID uuid.UUID, weights []domain.GradeWeight) error {
	for i := range weights {
		weights[i].ClassID = classID
		if err := u.gradeRepo.UpsertWeight(ctx, &weights[i]); err != nil {
			return err
		}
	}
	return nil
}

func (u *teacherPortalUseCase) GetClassGPA(ctx context.Context, classID uuid.UUID) ([]domain.GradeWeightedGPA, error) {
	return u.gradeRepo.GetWeightedGPA(ctx, classID)
}

func (u *teacherPortalUseCase) CurveGrades(ctx context.Context, classID uuid.UUID, term string, method string, factor float64) error {
	isLocked, err := u.classRepo.IsLocked(ctx, classID, term)
	if err != nil {
		return errors.New("failed to verify term lock")
	}
	if isLocked {
		return errors.New("gradebook is locked for term: " + term)
	}
	return u.gradeRepo.CurveGrades(ctx, classID, term, method, factor)
}

func (u *teacherPortalUseCase) GetGradeHistory(ctx context.Context, gradeID uuid.UUID) ([]domain.GradeLog, error) {
	return u.gradeRepo.GetHistory(ctx, gradeID)
}

func (u *teacherPortalUseCase) BulkSubmitGrades(ctx context.Context, classID uuid.UUID, editorID uuid.UUID, entries []domain.Grade) ([]domain.Grade, error) {
	lockedTerms := make(map[string]bool)
	for _, entry := range entries {
		if _, checked := lockedTerms[entry.Term]; !checked {
			locked, _ := u.classRepo.IsLocked(ctx, classID, entry.Term)
			lockedTerms[entry.Term] = locked
		}
		if lockedTerms[entry.Term] {
			return nil, errors.New("gradebook is locked for term: " + entry.Term)
		}
	}

	existingGrades, err := u.gradeRepo.GetByClassID(ctx, classID)
	if err != nil {
		return nil, errors.New("failed to fetch existing grades")
	}

	gradeMap := make(map[string]domain.Grade)
	for _, g := range existingGrades {
		key := g.StudentID.String() + "|" + g.Subject + "|" + g.Term + "|" + string(g.Category)
		gradeMap[key] = g
	}

	var saved []domain.Grade
	for i := range entries {
		entries[i].ClassID = classID
		entries[i].EditorID = editorID
		if entries[i].Category == "" {
			entries[i].Category = domain.CategoryAssignment
		}
		if entries[i].MaxScore == 0 {
			entries[i].MaxScore = 100
		}

		key := entries[i].StudentID.String() + "|" + entries[i].Subject + "|" + entries[i].Term + "|" + string(entries[i].Category)
		var oldScore float32 = 0
		gradeID := entries[i].ID

		if g, ok := gradeMap[key]; ok {
			entries[i].ID = g.ID
			gradeID = g.ID
			oldScore = g.Score
			if err := u.gradeRepo.Update(ctx, &entries[i]); err != nil {
				return nil, errors.New("failed to update grade")
			}
		} else {
			if err := u.gradeRepo.Create(ctx, &entries[i]); err != nil {
				return nil, errors.New("failed to save grade")
			}
			gradeID = entries[i].ID
		}

		_ = u.gradeRepo.LogChange(ctx, &domain.GradeLog{
			GradeID:  gradeID,
			EditorID: editorID,
			OldScore: oldScore,
			NewScore: entries[i].Score,
			Note:     "Bulk submit/update from portal",
		})

		saved = append(saved, entries[i])
	}
	return saved, nil
}

func (u *teacherPortalUseCase) ImportGrades(ctx context.Context, classID uuid.UUID, editorID uuid.UUID, fileReader interface{}) (int, []string, []string, error) {
	file, ok := fileReader.(multipart.File)
	if !ok {
		return 0, nil, nil, errors.New("invalid file format")
	}

	grades, warnings, err := repository.ParseCSVGrades(file, classID, editorID)
	if err != nil {
		return 0, nil, nil, err
	}

	lockedTerms := make(map[string]bool)
	for _, g := range grades {
		if _, checked := lockedTerms[g.Term]; !checked {
			locked, _ := u.classRepo.IsLocked(ctx, classID, g.Term)
			lockedTerms[g.Term] = locked
		}
		if lockedTerms[g.Term] {
			return 0, nil, nil, errors.New("gradebook is locked for term: " + g.Term)
		}
	}

	imported, failures, err := u.gradeRepo.BulkCreate(ctx, grades)
	if err != nil {
		return 0, nil, nil, err
	}

	for _, g := range grades {
		if g.ID != uuid.Nil {
			_ = u.gradeRepo.LogChange(ctx, &domain.GradeLog{
				GradeID:  g.ID,
				EditorID: editorID,
				OldScore: 0,
				NewScore: g.Score,
				Note:     "CSV Import Integration",
			})
		}
	}

	return imported, failures, warnings, nil
}

func (u *teacherPortalUseCase) GetClassForExport(ctx context.Context, classID uuid.UUID) (*domain.Class, []domain.Student, []domain.GradeWeightedGPA, error) {
	class, err := u.classRepo.GetByID(ctx, classID)
	if err != nil {
		return nil, nil, nil, errors.New("class not found")
	}
	students, err := u.studentRepo.GetByClass(ctx, classID)
	if err != nil {
		return nil, nil, nil, errors.New("failed to fetch students")
	}
	gpas, err := u.gradeRepo.GetWeightedGPA(ctx, classID)
	if err != nil {
		return nil, nil, nil, errors.New("failed to calculate GPAs")
	}
	return class, students, gpas, nil
}
