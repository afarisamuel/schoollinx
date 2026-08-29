package domain

import (
	"context"

	"github.com/google/uuid"
)

type StudentRepository interface {
	Create(ctx context.Context, student *Student) error
	BulkUpsert(ctx context.Context, students []Student, batchSize int) error
	GetByID(ctx context.Context, id uuid.UUID) (*Student, error)
	GetByEnrollmentNumber(ctx context.Context, enrollmentNum string) (*Student, error)
	GetAll(ctx context.Context) ([]Student, error)
	GetAllPaginated(ctx context.Context, query PaginationQuery) (int64, []Student, error)
	GetStudentsForTeacherPaginated(ctx context.Context, userID uuid.UUID, query PaginationQuery) (int64, []Student, error)
	Update(ctx context.Context, student *Student) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByClass(ctx context.Context, classID uuid.UUID) ([]Student, error)
	BatchUpdateEnrollment(ctx context.Context, studentIDs []uuid.UUID, classID uuid.UUID) error
	BulkPromote(ctx context.Context, studentIDs []uuid.UUID, nextAcademicYear string) error

	// Alumni extensions
	SaveAlumniProfile(ctx context.Context, profile *AlumniProfile) error
	GetAlumniProfile(ctx context.Context, studentID uuid.UUID) (*AlumniProfile, error)
	GetAlumni(ctx context.Context) ([]Student, error)

	// AppendGuardian links an already-saved guardian to an existing student in the join table.
	AppendGuardian(ctx context.Context, studentID uuid.UUID, guardian *Guardian) error
}

type StudentUseCase interface {
	CreateStudent(ctx context.Context, student *Student) error
	BulkUpsertStudents(ctx context.Context, students []Student, batchSize int) error
	GetStudentByID(ctx context.Context, id uuid.UUID) (*Student, error)
	GetAllStudents(ctx context.Context) ([]Student, error)
	GetAllStudentsPaginated(ctx context.Context, query PaginationQuery) (int64, []Student, error)
	GetStudentsForTeacherPaginated(ctx context.Context, userID uuid.UUID, query PaginationQuery) (int64, []Student, error)
	UpdateStudent(ctx context.Context, student *Student) error
	DeleteStudent(ctx context.Context, id uuid.UUID) error
	EnrollStudents(ctx context.Context, studentIDs []uuid.UUID, classID uuid.UUID) error
	GetStudentsByClass(ctx context.Context, classID uuid.UUID) ([]Student, error)

	// Alumni extensions
	GraduateStudent(ctx context.Context, studentID uuid.UUID, profile *AlumniProfile) error
	ListAlumni(ctx context.Context) ([]Student, error)
	GetAlumniLegacy(ctx context.Context, studentID uuid.UUID) (*Student, *AlumniProfile, error)
	// Promotion
	PromoteStudents(ctx context.Context, studentIDs []uuid.UUID, nextAcademicYear string) error
	
	// Timeline
	GetStudentTimeline(ctx context.Context, id uuid.UUID) ([]TimelineEvent, error)
}
