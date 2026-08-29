package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type studentRepository struct {
	db *gorm.DB
}

func NewStudentRepository(db *gorm.DB) domain.StudentRepository {
	return &studentRepository{db: db}
}

func (r *studentRepository) Create(ctx context.Context, student *domain.Student) error {
	return r.db.WithContext(ctx).Create(student).Error
}

// BulkUpsert inserts students in batches, updating existing records on index_number conflict.
func (r *studentRepository) BulkUpsert(ctx context.Context, students []domain.Student, batchSize int) error {
	if len(students) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"first_name", "last_name", "other_name", "gender", "dob",
				"phone_number",
				"placed_residence_type",
				"enrollment_num", "status",
				"level", "academic_year",
			}),
		}).
		CreateInBatches(&students, batchSize).Error
}

func (r *studentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Student, error) {
	var student domain.Student
	if err := r.db.WithContext(ctx).Preload("User").Preload("Class").Preload("Guardians").First(&student, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *studentRepository) GetByEnrollmentNumber(ctx context.Context, enrollmentNum string) (*domain.Student, error) {
	var student domain.Student
	if err := r.db.WithContext(ctx).Preload("User").Preload("Class").Preload("Guardians").First(&student, "enrollment_num = ?", enrollmentNum).Error; err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *studentRepository) GetAll(ctx context.Context) ([]domain.Student, error) {
	var students []domain.Student
	if err := r.db.WithContext(ctx).Preload("User").Preload("Class").Preload("Guardians").Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

func (r *studentRepository) GetAllPaginated(ctx context.Context, query domain.PaginationQuery) (int64, []domain.Student, error) {
	var count int64
	var students []domain.Student

	db := r.db.WithContext(ctx).Model(&domain.Student{})

	if err := db.Count(&count).Error; err != nil {
		return 0, nil, err
	}

	if err := db.Preload("User").Preload("Class").Preload("Guardians").
		Offset(query.GetOffset()).
		Limit(query.Limit).
		Find(&students).Error; err != nil {
		return 0, nil, err
	}
	return count, students, nil
}

func (r *studentRepository) Update(ctx context.Context, student *domain.Student) error {
	fields := map[string]interface{}{
		"first_name":            student.FirstName,
		"last_name":             student.LastName,
		"other_name":            student.OtherName,
		"gender":                student.Gender,
		"dob":                   student.DOB,
		"phone_number":          student.PhoneNumber,
		"address":               student.Address,
		"placed_residence_type": student.PlacedResidenceType,
		"status":                student.Status,
		"level":                 student.Level,
		"academic_year":         student.AcademicYear,
		"photo_url":             student.PhotoURL,
		"rfid_token":            student.RFIDToken,
		"prepaid_balance":       student.PrepaidBalance,
	}

	// enrollment_num has a UNIQUE constraint — only update it when non-empty
	// to avoid a collision when the field is left blank.
	if student.EnrollmentNum != "" {
		fields["enrollment_num"] = student.EnrollmentNum
	}

	// class_id is a nullable FK; explicitly write NULL when cleared.
	if student.ClassID != nil {
		fields["class_id"] = student.ClassID
	} else {
		fields["class_id"] = gorm.Expr("NULL")
	}

	return r.db.WithContext(ctx).Model(student).
		Omit("Guardians", "Class", "User", "AlumniProfile").
		Updates(fields).Error
}

func (r *studentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Student{}, "id = ?", id).Error
}

func (r *studentRepository) GetByClass(ctx context.Context, classID uuid.UUID) ([]domain.Student, error) {
	var students []domain.Student
	err := r.db.WithContext(ctx).Preload("User").Preload("Class").Where("class_id = ?", classID).Find(&students).Error
	return students, err
}

func (r *studentRepository) BatchUpdateEnrollment(ctx context.Context, studentIDs []uuid.UUID, classID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.Student{}).
		Where("id IN ?", studentIDs).
		Updates(map[string]interface{}{
			"class_id": classID,
		}).Error
}

func (r *studentRepository) BulkPromote(ctx context.Context, studentIDs []uuid.UUID, nextAcademicYear string) error {
	if len(studentIDs) == 0 {
		return nil
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{
			"level":         gorm.Expr("level + 1"),
			"academic_year": nextAcademicYear,
		}

		if err := tx.Model(&domain.Student{}).Where("id IN ?", studentIDs).Updates(updates).Error; err != nil {
			return err
		}

		// Handle graduations (Level > 3)
		now := time.Now()
		gradUpdates := map[string]interface{}{
			"status":          domain.StatusAlumni,
			"graduation_date": &now,
		}
		return tx.Model(&domain.Student{}).Where("id IN ? AND level > ?", studentIDs, 3).Updates(gradUpdates).Error
	})
}

func (r *studentRepository) SaveAlumniProfile(ctx context.Context, profile *domain.AlumniProfile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

func (r *studentRepository) GetAlumniProfile(ctx context.Context, studentID uuid.UUID) (*domain.AlumniProfile, error) {
	var profile domain.AlumniProfile
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *studentRepository) GetAlumni(ctx context.Context) ([]domain.Student, error) {
	var alumni []domain.Student
	err := r.db.WithContext(ctx).Preload("AlumniProfile").Where("status = ?", domain.StatusAlumni).Find(&alumni).Error
	return alumni, err
}

// AppendGuardian adds a guardian to the student's many2many association (student_guardians join table).
// The guardian must already be saved in the guardians table before calling this.
func (r *studentRepository) AppendGuardian(ctx context.Context, studentID uuid.UUID, guardian *domain.Guardian) error {
	tbl := "student_guardians"
	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" && schema != "public" {
		tbl = fmt.Sprintf(`"%s"."student_guardians"`, schema)
	}
	return r.db.WithContext(ctx).Exec(
		fmt.Sprintf("INSERT INTO %s (guardian_id, student_id) VALUES (?, ?) ON CONFLICT (guardian_id, student_id) DO NOTHING", tbl),
		guardian.ID, studentID,
	).Error
}
