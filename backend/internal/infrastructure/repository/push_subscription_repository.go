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

func (r *pushSubscriptionRepository) DeleteByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&domain.PushSubscription{}).Error
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

func (r *pushSubscriptionRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*domain.NotificationPreference, error) {
	var pref domain.NotificationPreference
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&pref).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return default preferences if not yet created
			return &domain.NotificationPreference{
				UserID:             userID,
				AttendanceAlerts:   true,
				GradeAlerts:        true,
				PaymentAlerts:      true,
				MessageAlerts:      true,
				AnnouncementAlerts: true,
				WelfareAlerts:      true,
				QuietHoursEnabled:  false,
				QuietHoursStart:    "21:00",
				QuietHoursEnd:      "06:30",
			}, nil
		}
		return nil, err
	}
	return &pref, nil
}

func (r *pushSubscriptionRepository) UpsertPreferences(ctx context.Context, pref *domain.NotificationPreference) error {
	if pref.ID == uuid.Nil {
		pref.ID = uuid.New()
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"attendance_alerts",
				"grade_alerts",
				"payment_alerts",
				"message_alerts",
				"announcement_alerts",
				"welfare_alerts",
				"quiet_hours_enabled",
				"quiet_hours_start",
				"quiet_hours_end",
				"updated_at",
			}),
		}).
		Create(pref).Error
}
