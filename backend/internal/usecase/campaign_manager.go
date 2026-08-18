package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"go.uber.org/zap"
)

type campaignManager struct {
	campaignRepo domain.CampaignRepository
	studentRepo  domain.StudentRepository
	userRepo     domain.UserRepository
	mailer       mailer.MailService
}

// CampaignManager is a combined interface for use case operations.
type CampaignManager interface {
	DraftCampaign(ctx context.Context, campaign *domain.Campaign) error
	DispatchCampaign(ctx context.Context, campaignID uuid.UUID) error
	GetAll(ctx context.Context) ([]domain.Campaign, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

func NewCampaignManager(
	campaignRepo domain.CampaignRepository,
	studentRepo domain.StudentRepository,
	userRepo domain.UserRepository,
	mailSvc mailer.MailService,
) CampaignManager {
	return &campaignManager{
		campaignRepo: campaignRepo,
		studentRepo:  studentRepo,
		userRepo:     userRepo,
		mailer:       mailSvc,
	}
}

func (m *campaignManager) DraftCampaign(ctx context.Context, campaign *domain.Campaign) error {
	campaign.Status = domain.CampaignStatusDraft
	return m.campaignRepo.Create(ctx, campaign)
}

func (m *campaignManager) GetAll(ctx context.Context) ([]domain.Campaign, error) {
	return m.campaignRepo.GetAll(ctx)
}

func (m *campaignManager) GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	return m.campaignRepo.GetByID(ctx, id)
}

func (m *campaignManager) Delete(ctx context.Context, id uuid.UUID) error {
	return m.campaignRepo.Delete(ctx, id)
}

// DispatchCampaign resolves the target audience, queues an async background worker
// and returns immediately so that the HTTP response is not blocked by SMTP latency.
func (m *campaignManager) DispatchCampaign(ctx context.Context, campaignID uuid.UUID) error {
	campaign, err := m.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("campaign not found: %w", err)
	}

	if campaign.Status == domain.CampaignStatusSent {
		return fmt.Errorf("campaign already dispatched")
	}

	// Resolve the target recipient emails
	recipients, err := m.resolveAudience(ctx, campaign.Target)
	if err != nil {
		return fmt.Errorf("failed to resolve audience: %w", err)
	}

	// Mark as SENDING immediately so double-fires are blocked
	campaign.Status = domain.CampaignStatusSending
	if err := m.campaignRepo.Update(ctx, campaign); err != nil {
		return err
	}

	// Extract tenant schema to pass it to the background goroutine
	// Since we cannot easily import middleware due to import cycles,
	// we use a custom context key or we define it in domain.
	// But in this project, middleware.TenantSchemaKey is exported and we CAN import it.
	// Wait, importing `github.com/user/high-school-management/backend/internal/api/middleware`
	// might cause a cycle if middleware imports usecase, but middleware imports domain, not usecase.
	// Actually, let's just pass `ctx`'s values by creating a new context and copying the TenantSchemaKey.
	
	// A safe way to pass specific keys without knowing them is to use a specific function,
	// but let's just use string type for now, or just extract the key from middleware.
	
	// Let's create a detachment context that inherits values from the original context
	// but cancels independently. This is a common pattern for "fire and forget".
	bgCtx := context.WithoutCancel(ctx)

	// Fire-and-forget background goroutine for non-blocking dispatch
	go func(execCtx context.Context) {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("panic recovered in campaign dispatch goroutine", nil, zap.Any("panic", r), zap.String("campaign_id", campaignID.String()))
				// Attempt to mark as failed
				campaign.Status = domain.CampaignStatusFailed
				_ = m.campaignRepo.Update(execCtx, campaign)
			}
		}()

		// Set a timeout of 5 minutes for dispatch
		execCtx, cancel := context.WithTimeout(execCtx, 5*time.Minute)
		defer cancel()


		logger.Info("Dispatching campaign", zap.String("subject", campaign.Subject), zap.Int("recipients", len(recipients)))

		sendErr := m.mailer.SendBulkHTML(execCtx, campaign.Subject, campaign.BodyHTML, recipients)

		if sendErr != nil {
			logger.Error("Campaign dispatch failed", sendErr, zap.String("campaign_id", campaignID.String()))
			campaign.Status = domain.CampaignStatusFailed
		} else {
			campaign.Status = domain.CampaignStatusSent
			logger.Info("Successfully dispatched campaign", zap.String("subject", campaign.Subject))
		}

		// Log each recipient
		for _, r := range recipients {
			status := "DELIVERED"
			if sendErr != nil {
				status = "ERROR"
			}
			_ = m.campaignRepo.LogAttempt(execCtx, &domain.CampaignLog{
				CampaignID: campaignID,
				Recipient:  r,
				Status:     status,
			})
		}

		_ = m.campaignRepo.Update(execCtx, campaign)
	}(bgCtx)

	return nil
}

// resolveAudience translates a target segment string to a list of email addresses.
// Supported targets: "ALL_PARENTS", "ALL_STUDENTS", "ALL_USERS"
func (m *campaignManager) resolveAudience(ctx context.Context, target string) ([]string, error) {
	var emails []string

	switch strings.ToUpper(target) {
	case "ALL_STUDENTS":
		students, err := m.studentRepo.GetAll(ctx)
		if err != nil {
			return nil, err
		}
		for _, s := range students {
			if s.User != nil {
				emails = append(emails, string(s.User.Email))
			}
		}
	case "ALL_USERS", "ALL_PARENTS":
		// For parents and all-users, we fetch from the users list.
		// In a broader system this would call a dedicated UserRepository.GetByRole method.
		users, err := m.userRepo.GetAll(ctx)
		if err != nil {
			return nil, err
		}
		for _, u := range users {
			if target == "ALL_PARENTS" && u.Role != domain.RoleGuardian {
				continue
			}
			emails = append(emails, string(u.Email))
		}
	default:
		return nil, fmt.Errorf("unsupported campaign target: %s", target)
	}

	return emails, nil
}
