package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"golang.org/x/crypto/bcrypt"
)

type guardianUseCase struct {
	guardianRepo domain.GuardianRepository
	studentRepo  domain.StudentRepository
	userRepo     domain.UserRepository
	mailService  mailer.MailService
}

func NewGuardianUseCase(repo domain.GuardianRepository, studentRepo domain.StudentRepository, userRepo domain.UserRepository, mailService mailer.MailService) domain.GuardianUseCase {
	return &guardianUseCase{
		guardianRepo: repo,
		studentRepo:  studentRepo,
		userRepo:     userRepo,
		mailService:  mailService,
	}
}

func (u *guardianUseCase) GetGuardianProfile(ctx context.Context, userID uuid.UUID) (*domain.Guardian, error) {
	return u.guardianRepo.GetByUserID(ctx, userID)
}

func (u *guardianUseCase) GetChildren(ctx context.Context, userID uuid.UUID) ([]domain.Student, error) {
	guardian, err := u.guardianRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("guardian profile not found")
	}

	return u.guardianRepo.GetLinkedStudents(ctx, guardian.ID)
}

func (u *guardianUseCase) CreateGuardian(ctx context.Context, guardian *domain.Guardian) error {
	return u.guardianRepo.Create(ctx, guardian)
}

func (u *guardianUseCase) UpdateGuardian(ctx context.Context, guardian *domain.Guardian) error {
	return u.guardianRepo.Update(ctx, guardian)
}

func (u *guardianUseCase) ResetPassword(ctx context.Context, id uuid.UUID) (string, error) {
	guardian, err := u.guardianRepo.GetByUserID(ctx, id)
	if err != nil || guardian == nil {
		// id might be guardian.ID, not userID — try GetAll and match
		all, _ := u.guardianRepo.GetAll(ctx)
		for _, g := range all {
			if g.ID == id {
				guardian = &g
				break
			}
		}
		if guardian == nil {
			return "", fmt.Errorf("guardian not found")
		}
	}

	user, err := u.userRepo.GetByID(ctx, guardian.UserID)
	if err != nil || user == nil {
		return "", fmt.Errorf("user account not found")
	}

	newPassword := generateRandomPassword(12)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	user.Password = string(hashedPassword)
	user.MustChangePassword = true
	if err := u.userRepo.Update(ctx, user); err != nil {
		return "", err
	}

	subject := "Your Portal Password Has Been Reset"
	body := fmt.Sprintf(`
		<h2>Hello %s,</h2>
		<p>Your portal password has been reset by an administrator.</p>
		<p><strong>New Temporary Password:</strong> %s</p>
		<p>Please log in and change your password immediately.</p>
	`, string(guardian.FirstName), newPassword)

	_ = u.mailService.SendBulkHTML(ctx, subject, body, []string{string(guardian.Email)})

	return newPassword, nil
}

