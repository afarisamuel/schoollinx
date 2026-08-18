package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AcademicAssignment struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TeacherID uuid.UUID `json:"teacher_id" gorm:"type:uuid"`
	ClassID   uuid.UUID `json:"class_id" gorm:"type:uuid"`
	SubjectID uuid.UUID `json:"subject_id" gorm:"type:uuid"`
	CreatedAt time.Time `json:"created_at"`

	// Preloaded fields
	Teacher *Teacher `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
	Class   *Class   `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Subject *Subject `json:"subject,omitempty" gorm:"foreignKey:SubjectID"`
}

func (aa *AcademicAssignment) BeforeCreate(tx *gorm.DB) (err error) {
	if aa.ID == uuid.Nil {
		aa.ID = uuid.New()
	}
	return
}

type AssignmentRepository interface {
	Create(ctx context.Context, assignment *AcademicAssignment) error
	GetByID(ctx context.Context, id uuid.UUID) (*AcademicAssignment, error)
	GetByClass(ctx context.Context, classID uuid.UUID) ([]AcademicAssignment, error)
	GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]AcademicAssignment, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type AssignmentUseCase interface {
	AssignTeacherToSubject(ctx context.Context, teacherID, classID, subjectID uuid.UUID) error
	GetAssignmentsByClass(ctx context.Context, classID uuid.UUID) ([]AcademicAssignment, error)
	GetAssignmentsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]AcademicAssignment, error)
	RemoveAssignment(ctx context.Context, id uuid.UUID) error
}
