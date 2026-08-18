package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type homeworkRepository struct {
	db *gorm.DB
}

func NewHomeworkRepository(db *gorm.DB) domain.HomeworkRepository {
	return &homeworkRepository{db: db}
}

func (r *homeworkRepository) Create(ctx context.Context, homework *domain.Homework) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(homework).Error
}

func (r *homeworkRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Homework, error) {
	var homework domain.Homework
	if r.db == nil {
		return &homework, nil
	}
	err := r.db.WithContext(ctx).Preload("Class").Preload("Teacher").First(&homework, "id = ?", id).Error
	return &homework, err
}

func (r *homeworkRepository) GetByClass(ctx context.Context, classID uuid.UUID) ([]domain.Homework, error) {
	var homeworks []domain.Homework
	if r.db == nil {
		return homeworks, nil
	}
	err := r.db.WithContext(ctx).Preload("Teacher").Where("class_id = ?", classID).Find(&homeworks).Error
	return homeworks, err
}

func (r *homeworkRepository) GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.Homework, error) {
	var homeworks []domain.Homework
	if r.db == nil {
		return homeworks, nil
	}
	err := r.db.WithContext(ctx).Preload("Class").Where("teacher_id = ?", teacherID).Find(&homeworks).Error
	return homeworks, err
}

func (r *homeworkRepository) Update(ctx context.Context, homework *domain.Homework) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Save(homework).Error
}

func (r *homeworkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Delete(&domain.Homework{}, "id = ?", id).Error
}

func (r *homeworkRepository) SubmitHomework(ctx context.Context, submission *domain.HomeworkSubmission) error {
	if r.db == nil { return nil }
	return r.db.WithContext(ctx).Save(submission).Error
}

func (r *homeworkRepository) GetSubmission(ctx context.Context, homeworkID, studentID uuid.UUID) (*domain.HomeworkSubmission, error) {
	var sub domain.HomeworkSubmission
	if r.db == nil { return &sub, nil }
	err := r.db.WithContext(ctx).Where("homework_id = ? AND student_id = ?", homeworkID, studentID).First(&sub).Error
	return &sub, err
}

func (r *homeworkRepository) GetSubmissionsForHomework(ctx context.Context, homeworkID uuid.UUID) ([]domain.HomeworkSubmission, error) {
	var subs []domain.HomeworkSubmission
	if r.db == nil { return subs, nil }
	err := r.db.WithContext(ctx).Where("homework_id = ?", homeworkID).Find(&subs).Error
	return subs, err
}

func (r *homeworkRepository) GradeSubmission(ctx context.Context, submissionID uuid.UUID, score float64, feedback string) error {
	if r.db == nil { return nil }
	return r.db.WithContext(ctx).Model(&domain.HomeworkSubmission{}).
		Where("id = ?", submissionID).
		Updates(map[string]interface{}{
			"score": score,
			"feedback": feedback,
			"status": domain.SubmissionStatusGraded,
			"graded_at": gorm.Expr("CURRENT_TIMESTAMP"),
		}).Error
}
