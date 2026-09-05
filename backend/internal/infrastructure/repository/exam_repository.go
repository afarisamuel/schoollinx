package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type examRepository struct {
	db *gorm.DB
}

func NewExamRepository(db *gorm.DB) domain.ExamRepository {
	return &examRepository{db: db}
}

func (r *examRepository) CreateExam(ctx context.Context, exam *domain.Exam) error {
	return r.db.WithContext(ctx).Create(exam).Error
}

func (r *examRepository) GetExams(ctx context.Context) ([]domain.Exam, error) {
	var exams []domain.Exam
	err := r.db.WithContext(ctx).Preload("Schedules").Preload("Schedules.Class").Order("start_date DESC").Find(&exams).Error
	return exams, err
}

func (r *examRepository) GetExamByID(ctx context.Context, id uuid.UUID) (*domain.Exam, error) {
	var exam domain.Exam
	err := r.db.WithContext(ctx).Preload("Schedules").Preload("Schedules.Class").First(&exam, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &exam, nil
}

func (r *examRepository) UpdateExam(ctx context.Context, exam *domain.Exam) error {
	return r.db.WithContext(ctx).Save(exam).Error
}

func (r *examRepository) DeleteExam(ctx context.Context, id uuid.UUID) error {
	// Delete any results for schedules under this exam
	var schedules []domain.ExamSchedule
	if err := r.db.WithContext(ctx).Where("exam_id = ?", id).Find(&schedules).Error; err == nil && len(schedules) > 0 {
		var schedIDs []uuid.UUID
		for _, s := range schedules {
			schedIDs = append(schedIDs, s.ID)
		}
		_ = r.db.WithContext(ctx).Where("exam_schedule_id IN ?", schedIDs).Delete(&domain.ExamResult{}).Error
	}
	_ = r.db.WithContext(ctx).Where("exam_id = ?", id).Delete(&domain.ExamSchedule{}).Error
	return r.db.WithContext(ctx).Delete(&domain.Exam{}, "id = ?", id).Error
}

func (r *examRepository) CreateSchedule(ctx context.Context, schedule *domain.ExamSchedule) error {
	return r.db.WithContext(ctx).Create(schedule).Error
}

func (r *examRepository) DeleteSchedule(ctx context.Context, id uuid.UUID) error {
	_ = r.db.WithContext(ctx).Where("exam_schedule_id = ?", id).Delete(&domain.ExamResult{}).Error
	return r.db.WithContext(ctx).Delete(&domain.ExamSchedule{}, "id = ?", id).Error
}

func (r *examRepository) GetSchedulesByExam(ctx context.Context, examID uuid.UUID) ([]domain.ExamSchedule, error) {
	var schedules []domain.ExamSchedule
	err := r.db.WithContext(ctx).Preload("Class").Where("exam_id = ?", examID).Find(&schedules).Error
	return schedules, err
}

func (r *examRepository) SaveResults(ctx context.Context, scheduleID uuid.UUID, results []domain.ExamResult) error {
	// Upsert results based on exam_schedule_id and student_id
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "exam_schedule_id"}, {Name: "student_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"score", "remarks", "editor_id", "updated_at"}),
	}).Create(&results).Error
}

func (r *examRepository) GetResultsBySchedule(ctx context.Context, scheduleID uuid.UUID) ([]domain.ExamResult, error) {
	var results []domain.ExamResult
	err := r.db.WithContext(ctx).Preload("Student").Where("exam_schedule_id = ?", scheduleID).Find(&results).Error
	return results, err
}

func (r *examRepository) GetResultsByStudent(ctx context.Context, studentID uuid.UUID) ([]domain.ExamResult, error) {
	var results []domain.ExamResult
	err := r.db.WithContext(ctx).Where("student_id = ?", studentID).Find(&results).Error
	return results, err
}
