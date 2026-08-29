package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Homework struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description" gorm:"type:text"`
	DueDate     string    `json:"due_date" gorm:"not null"`
	ClassID     uuid.UUID `json:"class_id" gorm:"type:uuid;not null"`
	Subject     string    `json:"subject" gorm:"not null"`
	TeacherID   uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Class   *Class   `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Teacher *Teacher `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
	Submissions []HomeworkSubmission `json:"submissions,omitempty" gorm:"foreignKey:HomeworkID"`
}

type SubmissionStatus string

const (
	SubmissionStatusDraft     SubmissionStatus = "DRAFT"
	SubmissionStatusSubmitted SubmissionStatus = "SUBMITTED"
	SubmissionStatusGraded    SubmissionStatus = "GRADED"
)

type HomeworkSubmission struct {
	TenantBase
	ID         uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	HomeworkID uuid.UUID        `json:"homework_id" gorm:"type:uuid;index;not null"`
	StudentID  uuid.UUID        `json:"student_id" gorm:"type:uuid;index;not null"`
	Content    string           `json:"content"` // Text submission
	FileURL    string           `json:"file_url"` // Optional attached file
	Status     SubmissionStatus `json:"status" gorm:"type:varchar(20);not null;default:'SUBMITTED'"`
	Score      *float64         `json:"score"`
	Feedback   string           `json:"feedback"`
	SubmittedAt time.Time       `json:"submitted_at"`
	GradedAt    *time.Time      `json:"graded_at"`
}

func (s *HomeworkSubmission) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

func (h *Homework) BeforeCreate(tx *gorm.DB) (err error) {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return
}

type HomeworkRepository interface {
	Create(ctx context.Context, homework *Homework) error
	GetByID(ctx context.Context, id uuid.UUID) (*Homework, error)
	GetByClass(ctx context.Context, classID uuid.UUID) ([]Homework, error)
	GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]Homework, error)
	Update(ctx context.Context, homework *Homework) error
	Delete(ctx context.Context, id uuid.UUID) error

	SubmitHomework(ctx context.Context, submission *HomeworkSubmission) error
	GetSubmission(ctx context.Context, homeworkID, studentID uuid.UUID) (*HomeworkSubmission, error)
	GetSubmissionsForHomework(ctx context.Context, homeworkID uuid.UUID) ([]HomeworkSubmission, error)
	GradeSubmission(ctx context.Context, submissionID uuid.UUID, score float64, feedback string) error
}

type HomeworkSimilarityMatch struct {
	StudentAID     uuid.UUID `json:"student_a_id"`
	StudentBID     uuid.UUID `json:"student_b_id"`
	SimilarityRate float64   `json:"similarity_rate"`
	IsFlagged      bool      `json:"is_flagged"`
}

type HomeworkUseCase interface {
	CreateHomework(ctx context.Context, homework *Homework) error
	GetHomeworkByID(ctx context.Context, id uuid.UUID) (*Homework, error)
	GetHomeworksByClass(ctx context.Context, classID uuid.UUID) ([]Homework, error)
	GetHomeworksByTeacher(ctx context.Context, teacherID uuid.UUID) ([]Homework, error)
	UpdateHomework(ctx context.Context, homework *Homework) error
	DeleteHomework(ctx context.Context, id uuid.UUID) error

	SubmitAssignment(ctx context.Context, submission *HomeworkSubmission) error
	GradeAssignment(ctx context.Context, submissionID uuid.UUID, score float64, feedback string) error
	GetStudentSubmission(ctx context.Context, homeworkID, studentID uuid.UUID) (*HomeworkSubmission, error)
	GetHomeworkSubmissions(ctx context.Context, homeworkID uuid.UUID) ([]HomeworkSubmission, error)
	CheckSubmissionsSimilarity(ctx context.Context, homeworkID uuid.UUID) ([]HomeworkSimilarityMatch, error)
}
