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

func (u *TimetableUseCase) GetTeacherTimetable(ctx context.Context, teacherID uuid.UUID) ([]domain.TimetableEntry, error) {
	return u.repo.GetByTeacher(ctx, teacherID)
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

func (u *TimetableUseCase) GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]domain.ExamSession, error) {
	return u.repo.GetExamScheduleByPeriod(ctx, academicPeriodID)
}

func (u *TimetableUseCase) CreateExamSession(ctx context.Context, session *domain.ExamSession) error {
	return u.repo.CreateExamSession(ctx, session)
}

func (u *TimetableUseCase) DeleteExamSession(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteExamSession(ctx, id)
}

func (u *TimetableUseCase) AutoGenerateTimetable(ctx context.Context, classID *uuid.UUID, clearExisting bool) ([]domain.TimetableEntry, int, error) {
	return u.repo.AutoGenerateClassTimetable(ctx, classID, clearExisting)
}

func (u *TimetableUseCase) ClearClassTimetable(ctx context.Context, classID uuid.UUID) error {
	return u.repo.DeleteByClass(ctx, classID)
}

func (u *TimetableUseCase) GetAvailableTeachers(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]domain.Teacher, error) {
	return u.repo.GetAvailableTeachers(ctx, dayOfWeek, startTime, endTime)
}

func (u *TimetableUseCase) GetTeacherUnavailabilities(ctx context.Context, teacherID *uuid.UUID) ([]domain.TeacherUnavailability, error) {
	return u.repo.GetTeacherUnavailabilities(ctx, teacherID)
}

func (u *TimetableUseCase) CreateTeacherUnavailability(ctx context.Context, unavail *domain.TeacherUnavailability) error {
	return u.repo.CreateTeacherUnavailability(ctx, unavail)
}

func (u *TimetableUseCase) DeleteTeacherUnavailability(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteTeacherUnavailability(ctx, id)
}

func (u *TimetableUseCase) AuditTimetable(ctx context.Context, classID *uuid.UUID) (*domain.TimetableAuditReport, error) {
	return u.repo.AuditTimetable(ctx, classID)
}

func (u *TimetableUseCase) SendTeacherDailyScheduleDigest(ctx context.Context, dayOfWeek int) (int, error) {
	return u.repo.SendTeacherDailyScheduleDigest(ctx, dayOfWeek)
}

func (u *TimetableUseCase) MoveOrSwapEntry(ctx context.Context, entryID uuid.UUID, targetDay int, targetStartTime, targetEndTime, targetRoom string) (*domain.TimetableEntry, *domain.TimetableEntry, error) {
	return u.repo.MoveOrSwapEntry(ctx, entryID, targetDay, targetStartTime, targetEndTime, targetRoom)
}

func (u *TimetableUseCase) GetMasterSchedule(ctx context.Context, dayOfWeek int) ([]domain.TimetableEntry, error) {
	return u.repo.GetMasterSchedule(ctx, dayOfWeek)
}

func (u *TimetableUseCase) GetRoomOccupancy(ctx context.Context, dayOfWeek int) ([]domain.RoomOccupancySlot, error) {
	return u.repo.GetRoomOccupancy(ctx, dayOfWeek)
}

func (u *TimetableUseCase) OptimizeTimetableAI(ctx context.Context, classID *uuid.UUID) (*domain.OptimizationResult, error) {
	return u.repo.OptimizeTimetableAI(ctx, classID)
}

func (u *TimetableUseCase) AutoAssignExamInvigilators(ctx context.Context, academicPeriodID uuid.UUID) (*domain.ExamInvigilationReport, error) {
	return u.repo.AutoAssignExamInvigilators(ctx, academicPeriodID)
}

func (u *TimetableUseCase) GetExamMasterSchedule(ctx context.Context, academicPeriodID uuid.UUID) ([]domain.ExamSessionWithInvigilation, error) {
	return u.repo.GetExamMasterSchedule(ctx, academicPeriodID)
}

func (u *TimetableUseCase) GenerateClassICSFeed(ctx context.Context, classID uuid.UUID) (string, error) {
	return u.repo.GenerateClassICSFeed(ctx, classID)
}

func (u *TimetableUseCase) GenerateTeacherICSFeed(ctx context.Context, teacherID uuid.UUID) (string, error) {
	return u.repo.GenerateTeacherICSFeed(ctx, teacherID)
}

// ──────────── Absence & substitution (Rec #4) ────────────
func (u *TimetableUseCase) MarkTeacherAbsent(ctx context.Context, teacherID uuid.UUID, reason string) (*domain.AbsenceWithSubstitutes, error) {
	return u.repo.MarkTeacherAbsent(ctx, teacherID, reason)
}

func (u *TimetableUseCase) AssignSubstitute(ctx context.Context, absenceID uuid.UUID, substituteID uuid.UUID, entryID uuid.UUID) (*domain.SubstituteAssignResult, error) {
	return u.repo.AssignSubstitute(ctx, absenceID, substituteID, entryID)
}

func (u *TimetableUseCase) GetActiveAbsences(ctx context.Context) ([]domain.TeacherAbsence, error) {
	return u.repo.GetActiveAbsences(ctx)
}

func (u *TimetableUseCase) ResolveAbsence(ctx context.Context, absenceID uuid.UUID) error {
	return u.repo.ResolveAbsence(ctx, absenceID)
}

// ──────────── Substitute audit log (Rec #5) ────────────
func (u *TimetableUseCase) LogSubstituteTeaching(ctx context.Context, log *domain.SubstituteLog) error {
	return u.repo.LogSubstituteTeaching(ctx, log)
}

func (u *TimetableUseCase) GetSubstituteLogs(ctx context.Context, entryID *uuid.UUID) ([]domain.SubstituteLog, error) {
	return u.repo.GetSubstituteLogs(ctx, entryID)
}

// ──────────── Snapshots (Rec #6) ────────────
func (u *TimetableUseCase) CreateSnapshot(ctx context.Context, label string) (*domain.TimetableSnapshot, error) {
	return u.repo.CreateSnapshot(ctx, label)
}

func (u *TimetableUseCase) ListSnapshots(ctx context.Context) ([]domain.TimetableSnapshot, error) {
	return u.repo.ListSnapshots(ctx)
}

func (u *TimetableUseCase) RestoreSnapshot(ctx context.Context, snapshotID uuid.UUID) (*domain.SnapshotRestoreResult, error) {
	return u.repo.RestoreSnapshot(ctx, snapshotID)
}

// ──────────── Cognitive weights (Rec #7) ────────────
func (u *TimetableUseCase) SetSubjectCognitiveWeight(ctx context.Context, w *domain.SubjectCognitiveWeight) error {
	return u.repo.SetSubjectCognitiveWeight(ctx, w)
}

func (u *TimetableUseCase) GetSubjectCognitiveWeights(ctx context.Context) ([]domain.SubjectCognitiveWeight, error) {
	return u.repo.GetSubjectCognitiveWeights(ctx)
}

// ──────────── Templates (Rec #8) ────────────
func (u *TimetableUseCase) SaveTimetableTemplate(ctx context.Context, t *domain.TimetableTemplate) error {
	return u.repo.SaveTimetableTemplate(ctx, t)
}

func (u *TimetableUseCase) ListTimetableTemplates(ctx context.Context) ([]domain.TimetableTemplate, error) {
	return u.repo.ListTimetableTemplates(ctx)
}

func (u *TimetableUseCase) ApplyTimetableTemplate(ctx context.Context, templateID uuid.UUID, clearExisting bool) (int, error) {
	return u.repo.ApplyTimetableTemplate(ctx, templateID, clearExisting)
}

// ──────────── Invigilation load (Rec #9) ────────────
func (u *TimetableUseCase) GetInvigilatorDutyLoadReport(ctx context.Context, academicPeriodID uuid.UUID) (*domain.InvigilatorDutyLoadReport, error) {
	return u.repo.GetInvigilatorDutyLoadReport(ctx, academicPeriodID)
}

func (u *TimetableUseCase) RebalanceInvigilationDuties(ctx context.Context, academicPeriodID uuid.UUID) (*domain.ExamInvigilationReport, error) {
	return u.repo.RebalanceInvigilationDuties(ctx, academicPeriodID)
}


