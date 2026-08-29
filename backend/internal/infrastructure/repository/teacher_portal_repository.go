package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/domain"
)

type teacherPortalRepository struct {
	db *gorm.DB
}

func NewTeacherPortalRepository(db *gorm.DB) domain.TeacherPortalRepository {
	return &teacherPortalRepository{db: db}
}

// Seating Charts
func (r *teacherPortalRepository) GetSeatingChart(ctx context.Context, classID uuid.UUID) (*domain.SeatingChart, error) {
	var chart domain.SeatingChart
	err := r.db.WithContext(ctx).Where("class_id = ?", classID).Order("updated_at DESC").First(&chart).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &chart, nil
}

func (r *teacherPortalRepository) SaveSeatingChart(ctx context.Context, chart *domain.SeatingChart) error {
	var existing domain.SeatingChart
	err := r.db.WithContext(ctx).Where("class_id = ?", chart.ClassID).First(&existing).Error
	if err == nil {
		chart.ID = existing.ID
		return r.db.WithContext(ctx).Save(chart).Error
	}
	if chart.ID == uuid.Nil {
		chart.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(chart).Error
}

// Lesson Plans
func (r *teacherPortalRepository) GetLessonPlans(ctx context.Context, teacherID, classID uuid.UUID) ([]domain.LessonPlan, error) {
	var plans []domain.LessonPlan
	query := r.db.WithContext(ctx)
	if teacherID != uuid.Nil {
		query = query.Where("teacher_id = ?", teacherID)
	}
	if classID != uuid.Nil {
		query = query.Where("class_id = ?", classID)
	}
	err := query.Order("week_number ASC, created_at DESC").Find(&plans).Error
	return plans, err
}

func (r *teacherPortalRepository) CreateLessonPlan(ctx context.Context, plan *domain.LessonPlan) error {
	if plan.ID == uuid.Nil {
		plan.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(plan).Error
}

func (r *teacherPortalRepository) UpdateLessonPlan(ctx context.Context, plan *domain.LessonPlan) error {
	return r.db.WithContext(ctx).Save(plan).Error
}

// Rubrics
func (r *teacherPortalRepository) GetRubrics(ctx context.Context) ([]domain.GradingRubric, error) {
	var rubrics []domain.GradingRubric
	err := r.db.WithContext(ctx).Preload("Criteria").Order("created_at DESC").Find(&rubrics).Error
	return rubrics, err
}

func (r *teacherPortalRepository) CreateRubric(ctx context.Context, rubric *domain.GradingRubric) error {
	if rubric.ID == uuid.Nil {
		rubric.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(rubric).Error
}

// Sickbay Referrals
func (r *teacherPortalRepository) CreateSickbayReferral(ctx context.Context, referral *domain.SickbayReferral) error {
	if referral.ID == uuid.Nil {
		referral.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(referral).Error
}

func (r *teacherPortalRepository) GetClassReferrals(ctx context.Context, classID uuid.UUID) ([]domain.SickbayReferral, error) {
	var referrals []domain.SickbayReferral
	err := r.db.WithContext(ctx).
		Joins("JOIN students ON students.id = sickbay_referrals.student_id").
		Where("students.class_id = ?", classID).
		Order("sickbay_referrals.created_at DESC").
		Find(&referrals).Error
	return referrals, err
}

// Teacher Resources
func (r *teacherPortalRepository) CreateResource(ctx context.Context, res *domain.TeacherResource) error {
	if res.ID == uuid.Nil {
		res.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(res).Error
}

func (r *teacherPortalRepository) GetClassResources(ctx context.Context, classID uuid.UUID) ([]domain.TeacherResource, error) {
	var res []domain.TeacherResource
	err := r.db.WithContext(ctx).Where("class_id = ?", classID).Order("created_at DESC").Find(&res).Error
	return res, err
}
