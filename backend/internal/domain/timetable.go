package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TimetableEntry struct {
	CreatedAt time.Time `json:"created_at"`
	StartTime string    `json:"start_time"` // e.g., "08:00"
	EndTime   string    `json:"end_time"`   // e.g., "09:30"
	Room      string    `json:"room"`
	DayOfWeek int       `json:"day_of_week"` // 1 (Mon) to 5 (Fri)
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ClassID   uuid.UUID `json:"class_id" gorm:"type:uuid;not null"`
	SubjectID uuid.UUID `json:"subject_id" gorm:"type:uuid;not null"`
	TeacherID uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null"`
	TenantBase
}

func (t *TimetableEntry) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return
}

type TimetableRepository interface {
	Create(ctx context.Context, entry *TimetableEntry) error
	GetByClass(ctx context.Context, classID uuid.UUID) ([]TimetableEntry, error)
	GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]TimetableEntry, error)
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByClass(ctx context.Context, classID uuid.UUID) error
	GetByOverlap(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]TimetableEntry, error)
	GetAvailableTeachers(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]Teacher, error)
	CreateExamSession(ctx context.Context, session *ExamSession) error
	DeleteExamSession(ctx context.Context, id uuid.UUID) error
	CreateInvigilationDuty(ctx context.Context, duty *InvigilationDuty) error
	GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]ExamSession, error)
	GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSession, error)
	AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error
	AutoGenerateClassTimetable(ctx context.Context, classID *uuid.UUID, clearExisting bool) ([]TimetableEntry, int, error)
	GetTeacherUnavailabilities(ctx context.Context, teacherID *uuid.UUID) ([]TeacherUnavailability, error)
	CreateTeacherUnavailability(ctx context.Context, unavail *TeacherUnavailability) error
	DeleteTeacherUnavailability(ctx context.Context, id uuid.UUID) error
	AuditTimetable(ctx context.Context, classID *uuid.UUID) (*TimetableAuditReport, error)
	SendTeacherDailyScheduleDigest(ctx context.Context, dayOfWeek int) (int, error)
	MoveOrSwapEntry(ctx context.Context, entryID uuid.UUID, targetDay int, targetStartTime, targetEndTime, targetRoom string) (*TimetableEntry, *TimetableEntry, error)
	GetMasterSchedule(ctx context.Context, dayOfWeek int) ([]TimetableEntry, error)
	GetRoomOccupancy(ctx context.Context, dayOfWeek int) ([]RoomOccupancySlot, error)
	OptimizeTimetableAI(ctx context.Context, classID *uuid.UUID) (*OptimizationResult, error)
	AutoAssignExamInvigilators(ctx context.Context, academicPeriodID uuid.UUID) (*ExamInvigilationReport, error)
	GetExamMasterSchedule(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSessionWithInvigilation, error)
	GenerateClassICSFeed(ctx context.Context, classID uuid.UUID) (string, error)
	GenerateTeacherICSFeed(ctx context.Context, teacherID uuid.UUID) (string, error)

	// Recommendation #1 – Cron morning digest (already exists, keeping for clarity)
	// Recommendation #3 – Fatigue is enforced in OptimizeTimetableAI already
	// Recommendation #4 – Absence & substitution
	MarkTeacherAbsent(ctx context.Context, teacherID uuid.UUID, reason string) (*AbsenceWithSubstitutes, error)
	AssignSubstitute(ctx context.Context, absenceID uuid.UUID, substituteID uuid.UUID, entryID uuid.UUID) (*SubstituteAssignResult, error)
	GetActiveAbsences(ctx context.Context) ([]TeacherAbsence, error)
	ResolveAbsence(ctx context.Context, absenceID uuid.UUID) error
	// Recommendation #5 – Substitute audit log
	LogSubstituteTeaching(ctx context.Context, log *SubstituteLog) error
	GetSubstituteLogs(ctx context.Context, entryID *uuid.UUID) ([]SubstituteLog, error)
	// Recommendation #6 – Timetable snapshots / version history
	CreateSnapshot(ctx context.Context, label string) (*TimetableSnapshot, error)
	ListSnapshots(ctx context.Context) ([]TimetableSnapshot, error)
	RestoreSnapshot(ctx context.Context, snapshotID uuid.UUID) (*SnapshotRestoreResult, error)
	// Recommendation #7 – Cognitive load weights
	SetSubjectCognitiveWeight(ctx context.Context, w *SubjectCognitiveWeight) error
	GetSubjectCognitiveWeights(ctx context.Context) ([]SubjectCognitiveWeight, error)
	// Recommendation #8 – Multi-year templates
	SaveTimetableTemplate(ctx context.Context, t *TimetableTemplate) error
	ListTimetableTemplates(ctx context.Context) ([]TimetableTemplate, error)
	ApplyTimetableTemplate(ctx context.Context, templateID uuid.UUID, clearExisting bool) (int, error)
	// Recommendation #9 – Invigilation duty load
	GetInvigilatorDutyLoadReport(ctx context.Context, academicPeriodID uuid.UUID) (*InvigilatorDutyLoadReport, error)
	RebalanceInvigilationDuties(ctx context.Context, academicPeriodID uuid.UUID) (*ExamInvigilationReport, error)
}

type TimetableUseCase interface {
	AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error
	AutoGenerateTimetable(ctx context.Context, classID *uuid.UUID, clearExisting bool) ([]TimetableEntry, int, error)
	ClearClassTimetable(ctx context.Context, classID uuid.UUID) error
	GetAvailableTeachers(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]Teacher, error)
	GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]ExamSession, error)
	GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSession, error)
	CreateExamSession(ctx context.Context, session *ExamSession) error
	DeleteExamSession(ctx context.Context, id uuid.UUID) error
	RemoveEntry(ctx context.Context, id uuid.UUID) error
	GetClassTimetable(ctx context.Context, classID uuid.UUID) ([]TimetableEntry, error)
	GetTeacherTimetable(ctx context.Context, teacherID uuid.UUID) ([]TimetableEntry, error)
	GetTeacherUnavailabilities(ctx context.Context, teacherID *uuid.UUID) ([]TeacherUnavailability, error)
	CreateTeacherUnavailability(ctx context.Context, unavail *TeacherUnavailability) error
	DeleteTeacherUnavailability(ctx context.Context, id uuid.UUID) error
	AuditTimetable(ctx context.Context, classID *uuid.UUID) (*TimetableAuditReport, error)
	SendTeacherDailyScheduleDigest(ctx context.Context, dayOfWeek int) (int, error)
	MoveOrSwapEntry(ctx context.Context, entryID uuid.UUID, targetDay int, targetStartTime, targetEndTime, targetRoom string) (*TimetableEntry, *TimetableEntry, error)
	GetMasterSchedule(ctx context.Context, dayOfWeek int) ([]TimetableEntry, error)
	GetRoomOccupancy(ctx context.Context, dayOfWeek int) ([]RoomOccupancySlot, error)
	OptimizeTimetableAI(ctx context.Context, classID *uuid.UUID) (*OptimizationResult, error)
	AutoAssignExamInvigilators(ctx context.Context, academicPeriodID uuid.UUID) (*ExamInvigilationReport, error)
	GetExamMasterSchedule(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSessionWithInvigilation, error)
	GenerateClassICSFeed(ctx context.Context, classID uuid.UUID) (string, error)
	GenerateTeacherICSFeed(ctx context.Context, teacherID uuid.UUID) (string, error)
	// Recommendation #4 – Absence & substitution
	MarkTeacherAbsent(ctx context.Context, teacherID uuid.UUID, reason string) (*AbsenceWithSubstitutes, error)
	AssignSubstitute(ctx context.Context, absenceID uuid.UUID, substituteID uuid.UUID, entryID uuid.UUID) (*SubstituteAssignResult, error)
	GetActiveAbsences(ctx context.Context) ([]TeacherAbsence, error)
	ResolveAbsence(ctx context.Context, absenceID uuid.UUID) error
	// Recommendation #5 – Substitute audit log
	LogSubstituteTeaching(ctx context.Context, log *SubstituteLog) error
	GetSubstituteLogs(ctx context.Context, entryID *uuid.UUID) ([]SubstituteLog, error)
	// Recommendation #6 – Snapshots
	CreateSnapshot(ctx context.Context, label string) (*TimetableSnapshot, error)
	ListSnapshots(ctx context.Context) ([]TimetableSnapshot, error)
	RestoreSnapshot(ctx context.Context, snapshotID uuid.UUID) (*SnapshotRestoreResult, error)
	// Recommendation #7 – Cognitive weights
	SetSubjectCognitiveWeight(ctx context.Context, w *SubjectCognitiveWeight) error
	GetSubjectCognitiveWeights(ctx context.Context) ([]SubjectCognitiveWeight, error)
	// Recommendation #8 – Templates
	SaveTimetableTemplate(ctx context.Context, t *TimetableTemplate) error
	ListTimetableTemplates(ctx context.Context) ([]TimetableTemplate, error)
	ApplyTimetableTemplate(ctx context.Context, templateID uuid.UUID, clearExisting bool) (int, error)
	// Recommendation #9 – Invigilation load
	GetInvigilatorDutyLoadReport(ctx context.Context, academicPeriodID uuid.UUID) (*InvigilatorDutyLoadReport, error)
	RebalanceInvigilationDuties(ctx context.Context, academicPeriodID uuid.UUID) (*ExamInvigilationReport, error)
}

// RoomOccupancySlot represents room booking state at a specific time
type RoomOccupancySlot struct {
	Room        string    `json:"room"`
	DayOfWeek   int       `json:"day_of_week"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	IsOccupied  bool      `json:"is_occupied"`
	ClassID     uuid.UUID `json:"class_id,omitempty"`
	ClassName   string    `json:"class_name,omitempty"`
	SubjectName string    `json:"subject_name,omitempty"`
	TeacherName string    `json:"teacher_name,omitempty"`
}

// OptimizationResult represents the output of the AI Simulated Annealing / Genetic optimizer
type OptimizationResult struct {
	FitnessScore      float64 `json:"fitness_score"` // 0.0 - 100.0%
	Iterations        int     `json:"iterations"`
	ConflictsResolved int     `json:"conflicts_resolved"`
	ElapsedMs         int64   `json:"elapsed_ms"`
	EntriesCount      int     `json:"entries_count"`
	Message           string  `json:"message"`
}

// ExamSessionWithInvigilation is a rich view of exam schedules
type ExamSessionWithInvigilation struct {
	SessionID    uuid.UUID `json:"session_id"`
	Date         time.Time `json:"date"`
	StartTime    string    `json:"start_time"`
	EndTime      string    `json:"end_time"`
	ClassID      uuid.UUID `json:"class_id"`
	ClassName    string    `json:"class_name"`
	SubjectID    uuid.UUID `json:"subject_id"`
	SubjectName  string    `json:"subject_name"`
	FacilityID   uuid.UUID `json:"facility_id"`
	RoomName     string    `json:"room_name"`
	Invigilators []Teacher `json:"invigilators"`
}

type ExamInvigilationReport struct {
	TotalSessions        int                           `json:"total_sessions"`
	InvigilatorsAssigned int                           `json:"invigilators_assigned"`
	RoomsAllocated       int                           `json:"rooms_allocated"`
	Sessions             []ExamSessionWithInvigilation `json:"sessions"`
}

// TeacherUnavailability represents days/periods when a teacher is not available for auto-scheduling
type TeacherUnavailability struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TeacherID uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null;index"`
	DayOfWeek int       `json:"day_of_week" gorm:"not null"` // 1 (Mon) - 5 (Fri), 0 = All week
	StartTime string    `json:"start_time"`                  // e.g. "08:00" or empty for full day
	EndTime   string    `json:"end_time"`                    // e.g. "12:00" or empty for full day
	Reason    string    `json:"reason"`                      // e.g. "Part-time off-duty", "Administrative duty"
	TenantBase
}

func (u *TeacherUnavailability) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return
}

// TimetableConflict represents a detected schedule conflict or violation
type TimetableConflict struct {
	Type        string    `json:"type"` // "teacher_double_booked", "room_double_booked", "teacher_fatigue", "teacher_unavailable"
	Severity    string    `json:"severity"` // "critical", "warning"
	Message     string    `json:"message"`
	DayOfWeek   int       `json:"day_of_week"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	ClassID     uuid.UUID `json:"class_id,omitempty"`
	ClassName   string    `json:"class_name,omitempty"`
	SubjectID   uuid.UUID `json:"subject_id,omitempty"`
	SubjectName string    `json:"subject_name,omitempty"`
	TeacherID   uuid.UUID `json:"teacher_id,omitempty"`
	TeacherName string    `json:"teacher_name,omitempty"`
	Room        string    `json:"room,omitempty"`
	EntryID     uuid.UUID `json:"entry_id,omitempty"`
}

type TimetableAuditSummary struct {
	TotalEntries        int `json:"total_entries"`
	TotalConflicts      int `json:"total_conflicts"`
	TeacherOverlaps     int `json:"teacher_overlaps"`
	RoomOverlaps        int `json:"room_overlaps"`
	FatigueViolations   int `json:"fatigue_violations"`
	UnavailabilityCount int `json:"unavailability_violations"`
	HealthScore         int `json:"health_score"` // 0 - 100
}

type TimetableAuditReport struct {
	Summary   TimetableAuditSummary `json:"summary"`
	Conflicts []TimetableConflict   `json:"conflicts"`
}

// ExamSession represents a scheduled exam block
type ExamSession struct {
	Date             time.Time `json:"date" gorm:"not null"`
	StartTime        string    `json:"start_time" gorm:"not null"`
	EndTime          string    `json:"end_time" gorm:"not null"`
	ID               uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	SubjectID        uuid.UUID `json:"subject_id" gorm:"type:uuid;not null"`
	ClassID          uuid.UUID `json:"class_id" gorm:"type:uuid;not null"`
	FacilityID       uuid.UUID `json:"facility_id" gorm:"type:uuid;not null"`
	AcademicPeriodID uuid.UUID `json:"academic_period_id" gorm:"type:uuid;not null"`
	TenantBase
}

// InvigilationDuty maps a teacher to an exam session to invigilate
type InvigilationDuty struct {
	TenantBase
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ExamSessionID uuid.UUID `json:"exam_session_id" gorm:"type:uuid;not null;index"`
	TeacherID     uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null;index"`
}

func (e *ExamSession) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

func (i *InvigilationDuty) BeforeCreate(tx *gorm.DB) (err error) {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return
}
// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION MODELS
// ─────────────────────────────────────────────────────────────────────────────

// TeacherAbsence records a teacher absence event for a given day
type TeacherAbsence struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TeacherID   uuid.UUID  `json:"teacher_id" gorm:"type:uuid;not null;index"`
	AbsentDate  time.Time  `json:"absent_date" gorm:"not null"`
	Reason      string     `json:"reason"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`
	SubstituteID *uuid.UUID `json:"substitute_id,omitempty" gorm:"type:uuid"`
	Notified    bool       `json:"notified" gorm:"default:false"`
	TenantBase
}

func (a *TeacherAbsence) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// SubstituteLog is an audit record of who actually taught which period
type SubstituteLog struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TimetableEntryID uuid.UUID `json:"timetable_entry_id" gorm:"type:uuid;not null;index"`
	OriginalTeacherID uuid.UUID `json:"original_teacher_id" gorm:"type:uuid;not null"`
	SubstituteID    uuid.UUID `json:"substitute_id" gorm:"type:uuid;not null"`
	DayOfWeek       int       `json:"day_of_week"`
	StartTime       string    `json:"start_time"`
	EndTime         string    `json:"end_time"`
	TaughtAt        time.Time `json:"taught_at" gorm:"not null"`
	Note            string    `json:"note"`
	TenantBase
}

func (s *SubstituteLog) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// TimetableSnapshot captures a full timetable state before optimization/auto-generation
type TimetableSnapshot struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Label       string    `json:"label"`    // e.g. "Before AI Optimize 2026-09-30"
	SnapshotJSON string   `json:"snapshot_json" gorm:"type:text"` // JSON blob of []TimetableEntry
	TenantBase
}

func (s *TimetableSnapshot) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// SubjectCognitiveWeight assigns a difficulty score to subjects for cognitive load scheduling
type SubjectCognitiveWeight struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	SubjectID uuid.UUID `json:"subject_id" gorm:"type:uuid;not null;uniqueIndex:idx_subj_weight_tenant"`
	Weight    int       `json:"weight" gorm:"not null;default:3"` // 1 (easy/PE) to 5 (hard/Math)
	TenantBase
}

func (w *SubjectCognitiveWeight) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

// TimetableTemplate stores a reusable schedule pattern (subjects × slots, no teacher assignment)
type TimetableTemplate struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name         string    `json:"name" gorm:"not null"` // e.g. "Term 1 Standard Template"
	TemplateJSON string    `json:"template_json" gorm:"type:text"`
	IsDefault    bool      `json:"is_default" gorm:"default:false"`
	TenantBase
}

func (t *TimetableTemplate) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT / DTO TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AbsenceWithSubstitutes struct {
	Absence      TeacherAbsence `json:"absence"`
	AffectedSlots []TimetableEntry `json:"affected_slots"`
	Substitutes   []Teacher        `json:"available_substitutes"`
}

type SubstituteAssignResult struct {
	Assigned  int    `json:"assigned"`
	Notified  int    `json:"notified"`
	Message   string `json:"message"`
}

type InvigilatorDutyLoad struct {
	Teacher        Teacher `json:"teacher"`
	SessionCount   int     `json:"session_count"`
	TotalMinutes   int     `json:"total_minutes"`
	LoadPercentage float64 `json:"load_percentage"` // relative to average
	IsOverloaded   bool    `json:"is_overloaded"`   // >150% avg
}

type InvigilatorDutyLoadReport struct {
	AverageMinutes  float64               `json:"average_minutes"`
	TotalSessions   int                   `json:"total_sessions"`
	MaxMinutes      int                   `json:"max_minutes"`
	Loads           []InvigilatorDutyLoad `json:"loads"`
	OverloadedCount int                   `json:"overloaded_count"`
}

type SnapshotRestoreResult struct {
	Restored  int    `json:"restored"`
	Cleared   int    `json:"cleared"`
	Message   string `json:"message"`
}
