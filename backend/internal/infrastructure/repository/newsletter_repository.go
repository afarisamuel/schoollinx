package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type newsletterRepository struct {
	db *gorm.DB
}

func NewNewsletterRepository(db *gorm.DB) domain.NewsletterRepository {
	return &newsletterRepository{db: db}
}

func (r *newsletterRepository) Subscribe(ctx context.Context, sub *domain.NewsletterSubscriber) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "guardian_id"}, {Name: "tenant_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"email", "frequency", "is_active", "updated_at"}),
	}).Create(sub).Error
}

func (r *newsletterRepository) Unsubscribe(ctx context.Context, guardianID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.NewsletterSubscriber{}).
		Where("guardian_id = ?", guardianID).
		Update("is_active", false).Error
}

func (r *newsletterRepository) GetSubscribers(ctx context.Context) ([]domain.NewsletterSubscriber, error) {
	var subs []domain.NewsletterSubscriber
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Find(&subs).Error
	return subs, err
}

func (r *newsletterRepository) GetSubscriberByGuardian(ctx context.Context, guardianID uuid.UUID) (*domain.NewsletterSubscriber, error) {
	var sub domain.NewsletterSubscriber
	err := r.db.WithContext(ctx).Where("guardian_id = ?", guardianID).First(&sub).Error
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

func (r *newsletterRepository) SaveNewsletter(ctx context.Context, n *domain.Newsletter) error {
	return r.db.WithContext(ctx).Save(n).Error
}

func (r *newsletterRepository) GetNewsletters(ctx context.Context) ([]domain.Newsletter, error) {
	var n []domain.Newsletter
	err := r.db.WithContext(ctx).Order("created_at desc").Find(&n).Error
	return n, err
}

func (r *newsletterRepository) GetNewsletterByID(ctx context.Context, id uuid.UUID) (*domain.Newsletter, error) {
	var n domain.Newsletter
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&n).Error
	if err != nil {
		return nil, err
	}
	return &n, nil
}
