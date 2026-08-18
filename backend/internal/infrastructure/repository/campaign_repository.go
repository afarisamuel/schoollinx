package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type campaignRepository struct {
	db *gorm.DB
}

// NewCampaignRepository initializes a GORM-backed storage mechanism for institutional Newsletters.
func NewCampaignRepository(db *gorm.DB) domain.CampaignRepository {
	return &campaignRepository{db: db}
}

func (r *campaignRepository) Create(ctx context.Context, campaign *domain.Campaign) error {
	return r.db.WithContext(ctx).Create(campaign).Error
}

func (r *campaignRepository) Update(ctx context.Context, campaign *domain.Campaign) error {
	return r.db.WithContext(ctx).Save(campaign).Error
}

func (r *campaignRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	var campaign domain.Campaign
	if err := r.db.WithContext(ctx).First(&campaign, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &campaign, nil
}

func (r *campaignRepository) GetAll(ctx context.Context) ([]domain.Campaign, error) {
	var campaigns []domain.Campaign
	// Note: We use WithCampus isolation here if needed, but campaigns are typically global institutional assets.
	// For now, sorting descending by creation so the newest drafts appear top in the UI.
	if err := r.db.WithContext(ctx).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		return nil, err
	}
	return campaigns, nil
}

func (r *campaignRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Campaign{}, "id = ?", id).Error
}

func (r *campaignRepository) LogAttempt(ctx context.Context, log *domain.CampaignLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}
