package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Class struct {
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	Name              string     `json:"name"`
	TeacherID         *uuid.UUID `json:"teacher_id" gorm:"type:uuid"`
	ScholasticLevelID *uuid.UUID `json:"scholastic_level_id" gorm:"type:uuid"`
	// Preloaded fields
	Teacher         *Teacher         `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
	ScholasticLevel *ScholasticLevel `json:"scholastic_level,omitempty" gorm:"foreignKey:ScholasticLevelID"`
	Subjects        []Subject        `json:"subjects,omitempty" gorm:"many2many:class_subjects;"`
	ID              uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	TenantBase
}

func (c *Class) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// ClassTermLock controls whether grades for a specific term can still be edited.
type ClassTermLock struct {
	UpdatedAt time.Time `json:"updated_at"`
	Term      string    `json:"term" gorm:"index:idx_class_term,unique"`
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ClassID   uuid.UUID `json:"class_id" gorm:"type:uuid;index:idx_class_term,unique"`
	IsLocked  bool      `json:"is_locked"`
	TenantBase
}

func (ctl *ClassTermLock) BeforeCreate(tx *gorm.DB) (err error) {
	if ctl.ID == uuid.Nil {
		ctl.ID = uuid.New()
	}
	return
}

type ClassRepository interface {
	Create(ctx context.Context, class *Class) error
	GetByID(ctx context.Context, id uuid.UUID) (*Class, error)
	GetAll(ctx context.Context) ([]Class, error)
	Update(ctx context.Context, class *Class) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Phase 19: Term Locks
	GetLocks(ctx context.Context, classID uuid.UUID) ([]ClassTermLock, error)
	UpsertLock(ctx context.Context, lock *ClassTermLock) error
	IsLocked(ctx context.Context, classID uuid.UUID, term string) (bool, error)
	GetClassesForTeacher(ctx context.Context, userID uuid.UUID) ([]Class, error)

	// Subject assignments
	GetClassSubjects(ctx context.Context, classID uuid.UUID) ([]Subject, error)
	SetClassSubjects(ctx context.Context, classID uuid.UUID, subjectIDs []uuid.UUID) error
}

type ClassUseCase interface {
	CreateClass(ctx context.Context, class *Class) error
	GetClassByID(ctx context.Context, id uuid.UUID) (*Class, error)
	GetAllClasses(ctx context.Context) ([]Class, error)
	GetClassesForTeacher(ctx context.Context, userID uuid.UUID) ([]Class, error)
	UpdateClass(ctx context.Context, class *Class) error
	DeleteClass(ctx context.Context, id uuid.UUID) error
}
