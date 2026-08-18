package domain

import (
	"time"

	"github.com/google/uuid"
)

// BulkGradeSubmission represents a payload from a teacher for quickly grading an entire class.
type BulkGradeSubmission struct {
	TeacherID  uuid.UUID     `json:"teacher_id" binding:"required"`
	SubjectID  uuid.UUID     `json:"subject_id" binding:"required"`
	TermID     uuid.UUID     `json:"term_id" binding:"required"`
	Grades     []StudentGrade `json:"grades" binding:"required,dive"`
	SubmittedAt time.Time     `json:"submitted_at"`
}

// StudentGrade represents an individual student's grade in a bulk submission.
type StudentGrade struct {
	StudentID uuid.UUID `json:"student_id" binding:"required"`
	Score     float64   `json:"score" binding:"required,min=0,max=100"`
	Comments  string    `json:"comments,omitempty"`
}
