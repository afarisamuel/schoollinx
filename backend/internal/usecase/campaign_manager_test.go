package usecase

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/user/high-school-management/backend/internal/domain"
)

type MockCampaignRepo struct {
	mock.Mock
}

func (m *MockCampaignRepo) Create(ctx context.Context, c *domain.Campaign) error {
	args := m.Called(ctx, c)
	return args.Error(0)
}
func (m *MockCampaignRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*domain.Campaign), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockCampaignRepo) Update(ctx context.Context, c *domain.Campaign) error {
	args := m.Called(ctx, c)
	return args.Error(0)
}
func (m *MockCampaignRepo) Delete(ctx context.Context, id uuid.UUID) error        { return nil }
func (m *MockCampaignRepo) GetAll(ctx context.Context) ([]domain.Campaign, error) { return nil, nil }
func (m *MockCampaignRepo) LogRecipient(ctx context.Context, log *domain.CampaignLog) error {
	return nil
}
func (m *MockCampaignRepo) LogAttempt(ctx context.Context, log *domain.CampaignLog) error { return nil }
func (m *MockCampaignRepo) GetLogs(ctx context.Context, campaignID uuid.UUID) ([]domain.CampaignLog, error) {
	return nil, nil
}

func TestDraftCampaign(t *testing.T) {
	mockRepo := new(MockCampaignRepo)
	cm := NewCampaignManager(mockRepo, nil, nil, nil)

	campaign := &domain.Campaign{
		Subject:  "Test Campaign",
		BodyHTML: "<p>Hello</p>",
	}

	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.Campaign")).Return(nil)

	err := cm.DraftCampaign(context.Background(), campaign)

	assert.NoError(t, err)
	assert.Equal(t, "Test Campaign", campaign.Subject)
	assert.Equal(t, domain.CampaignStatusDraft, campaign.Status)

	mockRepo.AssertExpectations(t)
}

func TestDispatchCampaign_AlreadySent(t *testing.T) {
	mockRepo := new(MockCampaignRepo)
	cm := NewCampaignManager(mockRepo, nil, nil, nil)

	campaignID := uuid.New()
	existing := &domain.Campaign{
		ID:     campaignID,
		Status: domain.CampaignStatusSent,
	}

	mockRepo.On("GetByID", mock.Anything, campaignID).Return(existing, nil)

	err := cm.DispatchCampaign(context.Background(), campaignID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "campaign already dispatched")

	mockRepo.AssertExpectations(t)
}
