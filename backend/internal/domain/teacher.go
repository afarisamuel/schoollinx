package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type Teacher struct {
	TenantBase
	ID          uuid.UUID                               `json:"id" gorm:"type:uuid;primaryKey"`
	FirstName   encryption.EncryptedString              `json:"first_name" gorm:"not null"`
	LastName    encryption.EncryptedString              `json:"last_name" gorm:"not null"`
	Email       encryption.DeterministicEncryptedString `json:"email" gorm:"unique;not null"`
	PhoneNumber encryption.EncryptedString              `json:"phone_number"`
	DOB         encryption.EncryptedString              `json:"dob"`
	Subjects       []Subject                               `json:"subjects,omitempty" gorm:"many2many:teacher_subjects;"`
	UserID         *uuid.UUID                              `json:"user_id" gorm:"type:uuid"`
	User           *User                                   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	StaffProfileID *uuid.UUID                              `json:"staff_profile_id" gorm:"type:uuid"`
	StaffProfile   *StaffProfile                           `json:"staff_profile,omitempty" gorm:"foreignKey:StaffProfileID"`
	CanCollectFees bool                                    `json:"can_collect_fees" gorm:"default:false"`
	SignatureURL   string                                  `json:"signature_url"`
	CreatedAt      time.Time                               `json:"created_at"`
	UpdatedAt      time.Time                               `json:"updated_at"`
}

func (t *Teacher) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return
}

// TeacherClassAssignment is a join table enabling many-to-many teacher-class links.
// A teacher can teach multiple subjects across multiple classes.
type TeacherClassAssignment struct {
	TenantBase
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TeacherID    uuid.UUID  `json:"teacher_id" gorm:"type:uuid;index;not null"`
	ClassID      uuid.UUID  `json:"class_id" gorm:"type:uuid;index;not null"`
	SubjectID    *uuid.UUID `json:"subject_id" gorm:"column:subject;type:uuid;index"`
	AcademicYear string     `json:"academic_year" gorm:"not null"`
	CreatedAt    time.Time  `json:"created_at"`

	Teacher  *Teacher  `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
	Class    *Class    `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Subject  *Subject  `json:"subject,omitempty" gorm:"foreignKey:SubjectID"`
}

func (tca *TeacherClassAssignment) BeforeCreate(tx *gorm.DB) (err error) {
	if tca.ID == uuid.Nil {
		tca.ID = uuid.New()
	}
	return
}

// TeacherRepository manages teacher persistence and class assignments.
type TeacherRepository interface {
	Create(ctx context.Context, teacher *Teacher) error
	GetByID(ctx context.Context, id uuid.UUID) (*Teacher, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*Teacher, error)
	GetAll(ctx context.Context) ([]Teacher, error)
	Update(ctx context.Context, teacher *Teacher) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Class Assignment management
	AssignToClass(ctx context.Context, assignment *TeacherClassAssignment) error
	BulkAssignToClass(ctx context.Context, assignments []TeacherClassAssignment) error
	UnassignFromClass(ctx context.Context, assignmentID uuid.UUID) error
	GetAssignments(ctx context.Context, teacherID uuid.UUID) ([]TeacherClassAssignment, error)
	GetAllAssignments(ctx context.Context) ([]TeacherClassAssignment, error)
}

// TeacherUseCase remains as-is for existing admin CRUD operations.
type TeacherUseCase interface {
	CreateTeacher(ctx context.Context, teacher *Teacher) error
	GetTeacherByID(ctx context.Context, id uuid.UUID) (*Teacher, error)
	GetAllTeachers(ctx context.Context) ([]Teacher, error)
	UpdateTeacher(ctx context.Context, teacher *Teacher) error
	DeleteTeacher(ctx context.Context, id uuid.UUID) error

	// Class Assignment management
	AssignToClass(ctx context.Context, assignment *TeacherClassAssignment) error
	BulkAssignToClass(ctx context.Context, assignments []TeacherClassAssignment) error
	UnassignFromClass(ctx context.Context, assignmentID uuid.UUID) error
	GetAssignments(ctx context.Context, teacherID uuid.UUID) ([]TeacherClassAssignment, error)
	GetAllAssignments(ctx context.Context) ([]TeacherClassAssignment, error)
	ActivatePortalAccess(ctx context.Context, id uuid.UUID) (string, string, error)
	ResetPassword(ctx context.Context, id uuid.UUID) (string, error)
}

// TeacherPortalUseCase defines the business logic for the teacher portal.
type TeacherPortalUseCase interface {
	GetMyClasses(ctx context.Context, userID uuid.UUID) (*Teacher, []TeacherClassAssignment, error)
	GetClassStudents(ctx context.Context, classID uuid.UUID) ([]Student, error)
	GetClassGrades(ctx context.Context, classID uuid.UUID) ([]Grade, error)
	GetClassWeights(ctx context.Context, classID uuid.UUID) ([]GradeWeight, error)
	UpdateClassWeights(ctx context.Context, classID uuid.UUID, weights []GradeWeight) error
	GetClassGPA(ctx context.Context, classID uuid.UUID) ([]GradeWeightedGPA, error)
	CurveGrades(ctx context.Context, classID uuid.UUID, term string, method string, factor float64) error
	GetGradeHistory(ctx context.Context, gradeID uuid.UUID) ([]GradeLog, error)
	BulkSubmitGrades(ctx context.Context, classID uuid.UUID, editorID uuid.UUID, entries []Grade) ([]Grade, error)
	ImportGrades(ctx context.Context, classID uuid.UUID, editorID uuid.UUID, fileReader interface{}) (int, []string, []string, error)
	GetClassForExport(ctx context.Context, classID uuid.UUID) (*Class, []Student, []GradeWeightedGPA, error)

	// Classroom Mastery Suite (Phase 1-3)
	GetSeatingChart(ctx context.Context, classID uuid.UUID) (*SeatingChart, error)
	SaveSeatingChart(ctx context.Context, chart *SeatingChart) error
	GetLessonPlans(ctx context.Context, teacherID, classID uuid.UUID) ([]LessonPlan, error)
	CreateLessonPlan(ctx context.Context, plan *LessonPlan) error
	UpdateLessonPlan(ctx context.Context, plan *LessonPlan) error
	GetRubrics(ctx context.Context) ([]GradingRubric, error)
	CreateRubric(ctx context.Context, rubric *GradingRubric) error
	CreateSickbayReferral(ctx context.Context, referral *SickbayReferral) error
	GetClassReferrals(ctx context.Context, classID uuid.UUID) ([]SickbayReferral, error)
	CreateResource(ctx context.Context, res *TeacherResource) error
	GetClassResources(ctx context.Context, classID uuid.UUID) ([]TeacherResource, error)
}
