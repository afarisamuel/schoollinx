package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
)

type newsletterUseCase struct {
	repo      domain.NewsletterRepository
	smtp      mailer.MailService
	intelRepo domain.IntelligenceRepository
}

func NewNewsletterUseCase(repo domain.NewsletterRepository, smtp mailer.MailService, intel domain.IntelligenceRepository) domain.NewsletterUseCase {
	return &newsletterUseCase{
		repo:      repo,
		smtp:      smtp,
		intelRepo: intel,
	}
}

func (u *newsletterUseCase) Subscribe(ctx context.Context, guardianID uuid.UUID, email string, frequency string) error {
	sub := &domain.NewsletterSubscriber{
		ID:         uuid.New(),
		GuardianID: guardianID,
		Email:      email,
		Frequency:  frequency,
		IsActive:   true,
	}
	return u.repo.Subscribe(ctx, sub)
}

func (u *newsletterUseCase) Unsubscribe(ctx context.Context, guardianID uuid.UUID) error {
	return u.repo.Unsubscribe(ctx, guardianID)
}

func (u *newsletterUseCase) GetSubscriberByGuardian(ctx context.Context, guardianID uuid.UUID) (*domain.NewsletterSubscriber, error) {
	return u.repo.GetSubscriberByGuardian(ctx, guardianID)
}

func (u *newsletterUseCase) GenerateWeeklyNewsletter(ctx context.Context) (*domain.Newsletter, error) {
	// Fetch institutional KPIs
	kpi, err := u.intelRepo.GetAggregateKPIs(ctx)
	if err != nil {
		return nil, err
	}

	content := fmt.Sprintf(`
		<h1>Weekly School Update</h1>
		<p>Here are the latest statistics for the school:</p>
		<ul>
			<li>Total Students: %d</li>
			<li>Average Attendance: %.1f%%</li>
			<li>Average GPA: %.1f</li>
		</ul>
		<p>Thank you for being part of our community!</p>
	`, kpi.TotalStudents, kpi.AverageAttendance, kpi.AverageGPA)

	newsletter := &domain.Newsletter{
		ID:       uuid.New(),
		Title:    "Weekly Digest - " + time.Now().Format("Jan 02, 2006"),
		Content:  content,
		Audience: "ALL",
		Status:   "DRAFT",
	}

	if err := u.repo.SaveNewsletter(ctx, newsletter); err != nil {
		return nil, err
	}

	return newsletter, nil
}

func (u *newsletterUseCase) SendNewsletter(ctx context.Context, id uuid.UUID) error {
	n, err := u.repo.GetNewsletterByID(ctx, id)
	if err != nil {
		return err
	}
	
	if n.Status == "SENT" {
		return fmt.Errorf("newsletter already sent")
	}

	subs, err := u.repo.GetSubscribers(ctx)
	if err != nil {
		return err
	}

	count := 0
	for _, s := range subs {
		if s.Email != "" {
			_ = u.smtp.SendBulkHTML(ctx, n.Title, n.Content, []string{s.Email})
			count++
		}
	}

	now := time.Now()
	n.Status = "SENT"
	n.SentAt = now
	n.SentCount = count
	return u.repo.SaveNewsletter(ctx, n)
}

func (u *newsletterUseCase) GetNewsletters(ctx context.Context) ([]domain.Newsletter, error) {
	return u.repo.GetNewsletters(ctx)
}

func (u *newsletterUseCase) CreateCustomNewsletter(ctx context.Context, title, content, audience string) (*domain.Newsletter, error) {
	newsletter := &domain.Newsletter{
		ID:       uuid.New(),
		Title:    title,
		Content:  content,
		Audience: audience,
		Status:   "DRAFT",
	}

	if err := u.repo.SaveNewsletter(ctx, newsletter); err != nil {
		return nil, err
	}

	return newsletter, nil
}
