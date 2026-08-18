package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type terminalEvaluationRepository struct {
	db *gorm.DB
}

func NewTerminalEvaluationRepository(db *gorm.DB) domain.TerminalEvaluationRepository {
	return &terminalEvaluationRepository{db: db}
}

func (r *terminalEvaluationRepository) Upsert(ctx context.Context, eval *domain.TerminalEvaluation) error {
	schema := ctx.Value(middleware.TenantSchemaKey).(string)
	tx := r.db.WithContext(ctx).Table(schema + ".terminal_evaluations")
	
	// Create or Update
	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "student_id"}, {Name: "academic_period_id"}, {Name: "term_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"conduct", "attitude", "interest", "class_teacher_remark", "head_teacher_remark", "updated_at"}),
	}).Create(eval).Error
}

func (r *terminalEvaluationRepository) GetByStudentAndTerm(ctx context.Context, studentID uuid.UUID, periodID uuid.UUID, termID uuid.UUID) (*domain.TerminalEvaluation, error) {
	schema := ctx.Value(middleware.TenantSchemaKey).(string)
	tx := r.db.WithContext(ctx).Table(schema + ".terminal_evaluations")

	var eval domain.TerminalEvaluation
	err := tx.Where("student_id = ? AND academic_period_id = ? AND term_id = ?", studentID, periodID, termID).First(&eval).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // Not found is okay, just return nil eval
		}
		return nil, err
	}
	return &eval, nil
}
