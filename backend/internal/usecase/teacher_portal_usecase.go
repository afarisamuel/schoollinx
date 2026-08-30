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
	portalRepo  domain.TeacherPortalRepository
}

func NewTeacherPortalUseCase(
	teacherRepo domain.TeacherRepository,
	studentRepo domain.StudentRepository,
	gradeRepo domain.GradeRepository,
	classRepo domain.ClassRepository,
	subjectRepo domain.SubjectRepository,
	portalRepo domain.TeacherPortalRepository,
) domain.TeacherPortalUseCase {
	return &teacherPortalUseCase{
		teacherRepo: teacherRepo,
		studentRepo: studentRepo,
		gradeRepo:   gradeRepo,
		classRepo:   classRepo,
		subjectRepo: subjectRepo,
		portalRepo:  portalRepo,
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

	// Also retrieve classes where this teacher is assigned directly on the classes table (classes.teacher_id)
	directClasses, _ := u.classRepo.GetClassesForTeacher(ctx, userID)
	classMap := make(map[uuid.UUID]domain.Class)
	for _, c := range directClasses {
		classMap[c.ID] = c
	}

	var expanded []domain.TeacherClassAssignment
	assignedClassIDs := make(map[uuid.UUID]bool)

	for _, a := range assignments {
		if a.Class == nil || a.Class.Name == "" {
			if c, ok := classMap[a.ClassID]; ok {
				a.Class = &c
			} else if cls, err := u.classRepo.GetByID(ctx, a.ClassID); err == nil && cls != nil {
				a.Class = cls
			}
		}
		assignedClassIDs[a.ClassID] = true

		if a.SubjectID == nil {
			// Class Teacher: explode into all subjects if subjects are configured
			subjects, _ := u.subjectRepo.GetAll(ctx)
			if len(subjects) > 0 {
				for i := range subjects {
					s := subjects[i] // local copy
					newAssign := a
					newAssign.ID = uuid.New() // prevent ID collisions on frontend keys
					newAssign.SubjectID = &s.ID
					newAssign.Subject = &s
					expanded = append(expanded, newAssign)
				}
			} else {
				// Retain class assignment even if no individual subjects are created yet
				expanded = append(expanded, a)
			}
		} else {
			expanded = append(expanded, a)
		}
	}

	// Include any classes where the teacher is designated as Class Master, but hasn't had rows in teacher_class_assignments
	for _, c := range directClasses {
		if !assignedClassIDs[c.ID] {
			cls := c
			expanded = append(expanded, domain.TeacherClassAssignment{
				ID:           uuid.New(),
				TeacherID:    teacher.ID,
				ClassID:      cls.ID,
				Class:        &cls,
				Teacher:      teacher,
				AcademicYear: "Current",
			})
			assignedClassIDs[c.ID] = true
		}
	}

	// Fallback: If no specific assignments exist, allow access to all institutional classes
	if len(expanded) == 0 {
		allClasses, _ := u.classRepo.GetAll(ctx)
		for _, c := range allClasses {
			cls := c
			expanded = append(expanded, domain.TeacherClassAssignment{
				ID:           uuid.New(),
				TeacherID:    teacher.ID,
				ClassID:      cls.ID,
				Class:        &cls,
				Teacher:      teacher,
				AcademicYear: "Current",
			})
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
	return u.gradeRepo.ReplaceWeights(ctx, classID, weights)
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

// Classroom Mastery Suite (Phase 1-3)
func (u *teacherPortalUseCase) GetSeatingChart(ctx context.Context, classID uuid.UUID) (*domain.SeatingChart, error) {
	return u.portalRepo.GetSeatingChart(ctx, classID)
}

func (u *teacherPortalUseCase) SaveSeatingChart(ctx context.Context, chart *domain.SeatingChart) error {
	return u.portalRepo.SaveSeatingChart(ctx, chart)
}

func (u *teacherPortalUseCase) GetLessonPlans(ctx context.Context, teacherID, classID uuid.UUID) ([]domain.LessonPlan, error) {
	return u.portalRepo.GetLessonPlans(ctx, teacherID, classID)
}

func (u *teacherPortalUseCase) CreateLessonPlan(ctx context.Context, plan *domain.LessonPlan) error {
	return u.portalRepo.CreateLessonPlan(ctx, plan)
}

func (u *teacherPortalUseCase) UpdateLessonPlan(ctx context.Context, plan *domain.LessonPlan) error {
	return u.portalRepo.UpdateLessonPlan(ctx, plan)
}

func (u *teacherPortalUseCase) GetRubrics(ctx context.Context) ([]domain.GradingRubric, error) {
	return u.portalRepo.GetRubrics(ctx)
}

func (u *teacherPortalUseCase) CreateRubric(ctx context.Context, rubric *domain.GradingRubric) error {
	return u.portalRepo.CreateRubric(ctx, rubric)
}

func (u *teacherPortalUseCase) CreateSickbayReferral(ctx context.Context, referral *domain.SickbayReferral) error {
	return u.portalRepo.CreateSickbayReferral(ctx, referral)
}

func (u *teacherPortalUseCase) GetClassReferrals(ctx context.Context, classID uuid.UUID) ([]domain.SickbayReferral, error) {
	return u.portalRepo.GetClassReferrals(ctx, classID)
}

func (u *teacherPortalUseCase) CreateResource(ctx context.Context, res *domain.TeacherResource) error {
	return u.portalRepo.CreateResource(ctx, res)
}

func (u *teacherPortalUseCase) GetClassResources(ctx context.Context, classID uuid.UUID) ([]domain.TeacherResource, error) {
	return u.portalRepo.GetClassResources(ctx, classID)
}

func (u *teacherPortalUseCase) CreateCoverRequest(ctx context.Context, req *domain.TeacherCoverRequest) error {
	return u.portalRepo.CreateCoverRequest(ctx, req)
}

func (u *teacherPortalUseCase) GetCoverRequests(ctx context.Context) ([]domain.TeacherCoverRequest, error) {
	return u.portalRepo.GetCoverRequests(ctx)
}

func (u *teacherPortalUseCase) ClaimCoverRequest(ctx context.Context, id, coverTeacherID uuid.UUID) error {
	return u.portalRepo.ClaimCoverRequest(ctx, id, coverTeacherID)
}
