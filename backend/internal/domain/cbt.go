package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type QuizStatus string

const (
	QuizStatusDraft     QuizStatus = "DRAFT"
	QuizStatusPublished QuizStatus = "PUBLISHED"
	QuizStatusClosed    QuizStatus = "CLOSED"
)

type QuestionType string

const (
	QuestionTypeMultipleChoice QuestionType = "MULTIPLE_CHOICE"
	QuestionTypeTrueFalse      QuestionType = "TRUE_FALSE"
	QuestionTypeShortAnswer    QuestionType = "SHORT_ANSWER"
)

type CBTQuestionBank struct {
	TenantBase
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey"`
	SubjectID   uuid.UUID   `json:"subject_id" gorm:"type:uuid;index;not null"`
	Topic       string      `json:"topic" gorm:"index"`
	Type        QuestionType `json:"type" gorm:"type:varchar(20);not null"`
	Content     string      `json:"content" gorm:"not null"`
	Options     string      `json:"options" gorm:"type:jsonb"`
	CorrectAnswer string    `json:"correct_answer" gorm:"not null"`
	Difficulty  int         `json:"difficulty" gorm:"default:1"` // 1: Easy, 2: Medium, 3: Hard
	Tags        string      `json:"tags"` // Comma-separated or JSON
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type CBTQuiz struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID  `json:"tenant_id" gorm:"type:uuid;index;not null"`
	ClassID     uuid.UUID  `json:"class_id" gorm:"type:uuid;index;not null"`
	SubjectID   uuid.UUID  `json:"subject_id" gorm:"type:uuid;index;not null"`
	TeacherID   uuid.UUID  `json:"teacher_id" gorm:"type:uuid;index;not null"`
	Title       string     `json:"title" gorm:"not null"`
	Description string     `json:"description"`
	Status      QuizStatus `json:"status" gorm:"type:varchar(20);not null;default:'DRAFT'"`
	TimeLimitMins int      `json:"time_limit_mins"` // 0 means untimed
	StartTime   *time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Questions   []CBTQuestion `json:"questions,omitempty" gorm:"foreignKey:QuizID"`
}

type CBTQuestion struct {
	ID            uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey"`
	QuizID        uuid.UUID    `json:"quiz_id" gorm:"type:uuid;index;not null"`
	Type          QuestionType `json:"type" gorm:"type:varchar(20);not null"`
	Content       string       `json:"content" gorm:"not null"` // Can include markdown/html
	Points        float64      `json:"points" gorm:"not null;default:1.0"`
	Order         int          `json:"order" gorm:"not null"`
	Options       string       `json:"options" gorm:"type:jsonb"` // JSON array of options for MC
	CorrectAnswer string       `json:"correct_answer" gorm:"not null"` // Index for MC, true/false for TF, string for SA
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
}

type QuizAttemptStatus string

const (
	AttemptStatusInProgress QuizAttemptStatus = "IN_PROGRESS"
	AttemptStatusSubmitted  QuizAttemptStatus = "SUBMITTED"
	AttemptStatusGraded     QuizAttemptStatus = "GRADED"
)

type CBTAttempt struct {
	ID          uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID         `json:"tenant_id" gorm:"type:uuid;index;not null"`
	QuizID      uuid.UUID         `json:"quiz_id" gorm:"type:uuid;index;not null"`
	StudentID   uuid.UUID         `json:"student_id" gorm:"type:uuid;index;not null"`
	Status      QuizAttemptStatus `json:"status" gorm:"type:varchar(20);not null;default:'IN_PROGRESS'"`
	Score       *float64          `json:"score"`
	MaxScore    float64           `json:"max_score"`
	StartedAt   time.Time         `json:"started_at" gorm:"not null"`
	CompletedAt *time.Time        `json:"completed_at"`
	Answers     []CBTAnswer       `json:"answers,omitempty" gorm:"foreignKey:AttemptID"`
}

type CBTAnswer struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	AttemptID    uuid.UUID `json:"attempt_id" gorm:"type:uuid;index;not null"`
	QuestionID   uuid.UUID `json:"question_id" gorm:"type:uuid;index;not null"`
	AnswerData   string    `json:"answer_data" gorm:"not null"`
	IsCorrect    *bool     `json:"is_correct"`
	PointsEarned *float64  `json:"points_earned"`
	CreatedAt    time.Time `json:"created_at"`
}

type CBTRepository interface {
	CreateQuiz(ctx context.Context, quiz *CBTQuiz) error
	GetQuizByID(ctx context.Context, id uuid.UUID) (*CBTQuiz, error)
	ListQuizzesByClass(ctx context.Context, classID uuid.UUID) ([]*CBTQuiz, error)
	
	AddQuestion(ctx context.Context, question *CBTQuestion) error
	GetQuestion(ctx context.Context, id uuid.UUID) (*CBTQuestion, error)
	
	StartAttempt(ctx context.Context, attempt *CBTAttempt) error
	SubmitAnswer(ctx context.Context, answer *CBTAnswer) error
	CompleteAttempt(ctx context.Context, attemptID uuid.UUID) error
	GetAttempt(ctx context.Context, attemptID uuid.UUID) (*CBTAttempt, error)

	// Question Bank Methods
	AddBankQuestion(ctx context.Context, q *CBTQuestionBank) error
	GetBankQuestionsBySubject(ctx context.Context, subjectID uuid.UUID, limit int) ([]CBTQuestionBank, error)
	GetBankQuestionsByTopic(ctx context.Context, subjectID uuid.UUID, topic string) ([]CBTQuestionBank, error)
}

type CBTQuestionBankUseCase interface {
	AddQuestion(ctx context.Context, q *CBTQuestionBank) error
	GetQuestionsForSubject(ctx context.Context, subjectID uuid.UUID) ([]CBTQuestionBank, error)
	GenerateQuizFromBank(ctx context.Context, quizID uuid.UUID, subjectID uuid.UUID, count int, criteria map[string]interface{}) error
}
