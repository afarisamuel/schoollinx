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
	GetByOverlap(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]TimetableEntry, error)
	CreateExamSession(ctx context.Context, session *ExamSession) error
	DeleteExamSession(ctx context.Context, id uuid.UUID) error
	CreateInvigilationDuty(ctx context.Context, duty *InvigilationDuty) error
	GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]ExamSession, error)
	GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSession, error)
	AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error
}

type TimetableUseCase interface {
	AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error
	GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]ExamSession, error)
	GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]ExamSession, error)
	CreateExamSession(ctx context.Context, session *ExamSession) error
	DeleteExamSession(ctx context.Context, id uuid.UUID) error
	RemoveEntry(ctx context.Context, id uuid.UUID) error
	GetClassTimetable(ctx context.Context, classID uuid.UUID) ([]TimetableEntry, error)
	GetTeacherTimetable(ctx context.Context, teacherID uuid.UUID) ([]TimetableEntry, error)
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
