package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type guardianRepository struct {
	db *gorm.DB
}

func NewGuardianRepository(db *gorm.DB) domain.GuardianRepository {
	return &guardianRepository{db: db}
}

func (r *guardianRepository) studentGuardiansTable(ctx context.Context) string {
	if schema, ok := middleware.GetTenantSchemaFromContext(ctx); ok && schema != "" && schema != "public" {
		return fmt.Sprintf(`"%s"."student_guardians"`, schema)
	}
	return "student_guardians"
}

func (r *guardianRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&guardian).Error; err != nil {
		return nil, err
	}
	students, _ := r.GetLinkedStudents(ctx, id)
	guardian.Students = make([]*domain.Student, len(students))
	for i := range students {
		guardian.Students[i] = &students[i]
	}
	return &guardian, nil
}

func (r *guardianRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&guardian).Error; err != nil {
		return nil, err
	}
	students, _ := r.GetLinkedStudents(ctx, guardian.ID)
	guardian.Students = make([]*domain.Student, len(students))
	for i := range students {
		guardian.Students[i] = &students[i]
	}
	return &guardian, nil
}

func (r *guardianRepository) GetLinkedStudents(ctx context.Context, guardianID uuid.UUID) ([]domain.Student, error) {
	var students []domain.Student
	tbl := r.studentGuardiansTable(ctx)
	err := r.db.WithContext(ctx).
		Joins(fmt.Sprintf("JOIN %s ON %s.student_id = students.id", tbl, tbl)).
		Where(fmt.Sprintf("%s.guardian_id = ?", tbl), guardianID).
		Preload("User").
		Preload("Class.Subjects").
		Preload("Class").
		Find(&students).Error

	return students, err
}

func (r *guardianRepository) GetAll(ctx context.Context) ([]domain.Guardian, error) {
	var guardians []domain.Guardian
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&guardians).Error
	if err != nil {
		// Fallback query without Order("created_at DESC") if created_at column has not been added to this tenant schema yet
		err = r.db.WithContext(ctx).Find(&guardians).Error
	}
	if err != nil {
		return nil, err
	}

	tbl := r.studentGuardiansTable(ctx)
	type Link struct {
		GuardianID uuid.UUID
		StudentID  uuid.UUID
	}
	var links []Link
	_ = r.db.WithContext(ctx).Raw(fmt.Sprintf("SELECT guardian_id, student_id FROM %s", tbl)).Scan(&links).Error

	if len(links) > 0 {
		var studentIDs []uuid.UUID
		gMap := make(map[uuid.UUID][]uuid.UUID)
		for _, l := range links {
			gMap[l.GuardianID] = append(gMap[l.GuardianID], l.StudentID)
			studentIDs = append(studentIDs, l.StudentID)
		}

		var students []domain.Student
		_ = r.db.WithContext(ctx).Preload("Class").Where("id IN ?", studentIDs).Find(&students).Error

		sMap := make(map[uuid.UUID]*domain.Student)
		for i := range students {
			sMap[students[i].ID] = &students[i]
		}

		for i := range guardians {
			for _, sid := range gMap[guardians[i].ID] {
				if s, ok := sMap[sid]; ok {
					guardians[i].Students = append(guardians[i].Students, s)
				}
			}
		}
	}

	return guardians, nil
}

func (r *guardianRepository) Create(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Create(guardian).Error
}

func (r *guardianRepository) Update(ctx context.Context, guardian *domain.Guardian) error {
	return r.db.WithContext(ctx).Save(guardian).Error
}

func (r *guardianRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tbl := r.studentGuardiansTable(ctx)
	_ = r.db.WithContext(ctx).Exec(fmt.Sprintf("DELETE FROM %s WHERE guardian_id = ?", tbl), id).Error
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Guardian{}).Error
}

func (r *guardianRepository) LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	tbl := r.studentGuardiansTable(ctx)
	return r.db.WithContext(ctx).Exec(
		fmt.Sprintf("INSERT INTO %s (guardian_id, student_id) VALUES (?, ?) ON CONFLICT (guardian_id, student_id) DO NOTHING", tbl),
		guardianID, studentID,
	).Error
}

func (r *guardianRepository) UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	tbl := r.studentGuardiansTable(ctx)
	return r.db.WithContext(ctx).Exec(
		fmt.Sprintf("DELETE FROM %s WHERE guardian_id = ? AND student_id = ?", tbl),
		guardianID, studentID,
	).Error
}

// GetForStudent returns all guardians linked to a student via the student_guardians join table.
func (r *guardianRepository) GetForStudent(ctx context.Context, studentID uuid.UUID) ([]*domain.Guardian, error) {
	var guardians []*domain.Guardian
	tbl := r.studentGuardiansTable(ctx)
	err := r.db.WithContext(ctx).
		Joins(fmt.Sprintf("JOIN %s ON %s.guardian_id = guardians.id", tbl, tbl)).
		Where(fmt.Sprintf("%s.student_id = ?", tbl), studentID).
		Find(&guardians).Error
	return guardians, err
}

func (r *guardianRepository) GetByPickupCode(ctx context.Context, code string) (*domain.Guardian, error) {
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("pickup_code = ?", code).First(&guardian).Error; err != nil {
		return nil, err
	}
	students, _ := r.GetLinkedStudents(ctx, guardian.ID)
	guardian.Students = make([]*domain.Student, len(students))
	for i := range students {
		guardian.Students[i] = &students[i]
	}
	return &guardian, nil
}

func (r *guardianRepository) CreateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return r.db.WithContext(ctx).Create(req).Error
}

func (r *guardianRepository) GetAbsenceRequestsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]domain.AbsenceRequest, error) {
	var list []domain.AbsenceRequest
	err := r.db.WithContext(ctx).
		Where("guardian_id = ?", guardianID).
		Preload("Student").
		Order("created_at DESC").
		Find(&list).Error
	if err != nil {
		_ = r.db.WithContext(ctx).AutoMigrate(&domain.AbsenceRequest{})
		err = r.db.WithContext(ctx).
			Where("guardian_id = ?", guardianID).
			Preload("Student").
			Find(&list).Error
		if err != nil {
			return []domain.AbsenceRequest{}, nil
		}
	}
	if list == nil {
		list = []domain.AbsenceRequest{}
	}
	return list, nil
}

func (r *guardianRepository) GetAllAbsenceRequests(ctx context.Context) ([]domain.AbsenceRequest, error) {
	var list []domain.AbsenceRequest
	err := r.db.WithContext(ctx).
		Preload("Student").
		Preload("Guardian").
		Order("created_at DESC").
		Find(&list).Error
	if err != nil {
		_ = r.db.WithContext(ctx).AutoMigrate(&domain.AbsenceRequest{})
		err = r.db.WithContext(ctx).
			Preload("Student").
			Preload("Guardian").
			Find(&list).Error
		if err != nil {
			return []domain.AbsenceRequest{}, nil
		}
	}
	if list == nil {
		list = []domain.AbsenceRequest{}
	}
	return list, nil
}

func (r *guardianRepository) GetAbsenceRequestByID(ctx context.Context, id uuid.UUID) (*domain.AbsenceRequest, error) {
	var req domain.AbsenceRequest
	if err := r.db.WithContext(ctx).Where("id = ?", id).Preload("Student").Preload("Guardian").First(&req).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *guardianRepository) UpdateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return r.db.WithContext(ctx).Save(req).Error
}

// Temporary Pickup OTP
func (r *guardianRepository) CreateTemporaryPickupOTP(ctx context.Context, otp *domain.TemporaryPickupOTP) error {
	if otp.ID == uuid.Nil {
		otp.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(otp).Error
}

func (r *guardianRepository) GetValidPickupOTP(ctx context.Context, code string) (*domain.TemporaryPickupOTP, error) {
	var otp domain.TemporaryPickupOTP
	now := time.Now()
	err := r.db.WithContext(ctx).Where("otp = ? AND is_used = false AND expires_at > ?", code, now).First(&otp).Error
	if err != nil {
		return nil, err
	}
	return &otp, nil
}

func (r *guardianRepository) MarkPickupOTPUsed(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&domain.TemporaryPickupOTP{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_used": true,
		"used_at": &now,
	}).Error
}
