package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExamStatus string

const (
	ExamStatusDraft     ExamStatus = "DRAFT"
	ExamStatusPublished ExamStatus = "PUBLISHED"
	ExamStatusCompleted ExamStatus = "COMPLETED"
)

type Exam struct {
	TenantBase
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	Title         string     `json:"title" gorm:"not null"`
	Description   string     `json:"description"`
	AcademicYear  string     `json:"academic_year"`
	Term          string     `json:"term"`
	Status        ExamStatus `json:"status" gorm:"default:DRAFT"`
	StartDate     time.Time  `json:"start_date"`
	EndDate       time.Time  `json:"end_date"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	Schedules []ExamSchedule `json:"schedules,omitempty" gorm:"foreignKey:ExamID"`
}

func (e *Exam) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

type ExamSchedule struct {
	TenantBase
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	ExamID        uuid.UUID  `json:"exam_id" gorm:"type:uuid;not null"`
	ClassID       uuid.UUID  `json:"class_id" gorm:"type:uuid;not null"`
	Class         *Class     `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Subject       string     `json:"subject" gorm:"not null"`
	Room          string     `json:"room"`
	InvigilatorID *uuid.UUID `json:"invigilator_id"`
	Date          time.Time  `json:"date" gorm:"not null"`
	StartTime     string     `json:"start_time"` // e.g., "09:00"
	EndTime       string     `json:"end_time"`   // e.g., "11:00"
	MaxScore      float32    `json:"max_score" gorm:"default:100"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type ExamConflict struct {
	Type        string    `json:"type"` // "CLASS_DOUBLE_BOOKING", "INVIGILATOR_CONFLICT", "ROOM_CONFLICT"
	Date        time.Time `json:"date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	ScheduleA   uuid.UUID `json:"schedule_a"`
	ScheduleB   uuid.UUID `json:"schedule_b"`
	Description string    `json:"description"`
}

func (es *ExamSchedule) BeforeCreate(tx *gorm.DB) (err error) {
	if es.ID == uuid.Nil {
		es.ID = uuid.New()
	}
	return
}

type ExamResult struct {
	TenantBase
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ExamScheduleID uuid.UUID `json:"exam_schedule_id" gorm:"type:uuid;not null;uniqueIndex:idx_exam_result"`
	StudentID      uuid.UUID `json:"student_id" gorm:"type:uuid;not null;uniqueIndex:idx_exam_result"`
	Student        *Student  `json:"student,omitempty" gorm:"foreignKey:StudentID"`
	Score          float32   `json:"score"`
	Remarks        string    `json:"remarks"`
	EditorID       uuid.UUID `json:"editor_id" gorm:"type:uuid"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (er *ExamResult) BeforeCreate(tx *gorm.DB) (err error) {
	if er.ID == uuid.Nil {
		er.ID = uuid.New()
	}
	return
}

type ExamRepository interface {
	CreateExam(ctx context.Context, exam *Exam) error
	GetExams(ctx context.Context) ([]Exam, error)
	GetExamByID(ctx context.Context, id uuid.UUID) (*Exam, error)
	UpdateExam(ctx context.Context, exam *Exam) error
	DeleteExam(ctx context.Context, id uuid.UUID) error
	
	CreateSchedule(ctx context.Context, schedule *ExamSchedule) error
	DeleteSchedule(ctx context.Context, id uuid.UUID) error
	GetSchedulesByExam(ctx context.Context, examID uuid.UUID) ([]ExamSchedule, error)
	
	SaveResults(ctx context.Context, scheduleID uuid.UUID, results []ExamResult) error
	GetResultsBySchedule(ctx context.Context, scheduleID uuid.UUID) ([]ExamResult, error)
	GetResultsByStudent(ctx context.Context, studentID uuid.UUID) ([]ExamResult, error)
}

type ExamUseCase interface {
	CreateExam(ctx context.Context, exam *Exam) error
	GetExams(ctx context.Context) ([]Exam, error)
	GetExamByID(ctx context.Context, id uuid.UUID) (*Exam, error)
	UpdateExam(ctx context.Context, exam *Exam) error
	DeleteExam(ctx context.Context, id uuid.UUID) error
	
	AddSchedule(ctx context.Context, schedule *ExamSchedule) error
	DeleteSchedule(ctx context.Context, id uuid.UUID) error
	GetExamSchedules(ctx context.Context, examID uuid.UUID) ([]ExamSchedule, error)
	
	SubmitResults(ctx context.Context, scheduleID uuid.UUID, results []ExamResult) error
	GetScheduleResults(ctx context.Context, scheduleID uuid.UUID) ([]ExamResult, error)
	CheckConflicts(ctx context.Context, examID uuid.UUID) ([]ExamConflict, error)
}
