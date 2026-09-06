package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type pushSubscriptionRepository struct {
	db *gorm.DB
}

func NewPushSubscriptionRepository(db *gorm.DB) domain.PushSubscriptionRepository {
	return &pushSubscriptionRepository{db: db}
}

func (r *pushSubscriptionRepository) Upsert(ctx context.Context, sub *domain.PushSubscription) error {
	if sub.ID == uuid.Nil {
		sub.ID = uuid.New()
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "endpoint"}},
			DoUpdates: clause.AssignmentColumns([]string{"user_id", "p256dh", "auth", "user_agent", "updated_at"}),
		}).
		Create(sub).Error
}

func (r *pushSubscriptionRepository) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	return r.db.WithContext(ctx).Where("endpoint = ?", endpoint).Delete(&domain.PushSubscription{}).Error
}

func (r *pushSubscriptionRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]domain.PushSubscription, error) {
	var subs []domain.PushSubscription
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&subs).Error
	return subs, err
}

func (r *pushSubscriptionRepository) GetAll(ctx context.Context) ([]domain.PushSubscription, error) {
	var subs []domain.PushSubscription
	err := r.db.WithContext(ctx).Find(&subs).Error
	return subs, err
}
