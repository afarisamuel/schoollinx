package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"golang.org/x/crypto/bcrypt"
)

type teacherUseCase struct {
	teacherRepo domain.TeacherRepository
	userRepo    domain.UserRepository
	mailService mailer.MailService
}

func NewTeacherUseCase(repo domain.TeacherRepository, userRepo domain.UserRepository, mailService mailer.MailService) domain.TeacherUseCase {
	return &teacherUseCase{
		teacherRepo: repo,
		userRepo:    userRepo,
		mailService: mailService,
	}
}

func (u *teacherUseCase) CreateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	// Automatically create a base HR Staff Profile for this teacher
	staffID := uuid.New()
	teacher.StaffProfileID = &staffID
	teacher.StaffProfile = &domain.StaffProfile{
		ID:          staffID,
		FirstName:   string(teacher.FirstName),
		LastName:    string(teacher.LastName),
		Email:       encryption.EncryptedString(teacher.Email),
		PhoneNumber: encryption.EncryptedString(teacher.PhoneNumber),
		JobTitle:    "Teacher",
		Department:  "Academic",
		BaseSalary:  0,
	}

	return u.teacherRepo.Create(ctx, teacher)
}
func (u *teacherUseCase) GetTeacherByID(ctx context.Context, id uuid.UUID) (*domain.Teacher, error) {
	return u.teacherRepo.GetByID(ctx, id)
}

func (u *teacherUseCase) GetAllTeachers(ctx context.Context) ([]domain.Teacher, error) {
	return u.teacherRepo.GetAll(ctx)
}


func (u *teacherUseCase) UpdateTeacher(ctx context.Context, teacher *domain.Teacher) error {
	return u.teacherRepo.Update(ctx, teacher)
}

func (u *teacherUseCase) DeleteTeacher(ctx context.Context, id uuid.UUID) error {
	return u.teacherRepo.Delete(ctx, id)
}

func (u *teacherUseCase) AssignToClass(ctx context.Context, assignment *domain.TeacherClassAssignment) error {
	return u.teacherRepo.AssignToClass(ctx, assignment)
}

func (u *teacherUseCase) BulkAssignToClass(ctx context.Context, assignments []domain.TeacherClassAssignment) error {
	return u.teacherRepo.BulkAssignToClass(ctx, assignments)
}

func (u *teacherUseCase) UnassignFromClass(ctx context.Context, assignmentID uuid.UUID) error {
	return u.teacherRepo.UnassignFromClass(ctx, assignmentID)
}

func (u *teacherUseCase) GetAssignments(ctx context.Context, teacherID uuid.UUID) ([]domain.TeacherClassAssignment, error) {
	return u.teacherRepo.GetAssignments(ctx, teacherID)
}

func (u *teacherUseCase) GetAllAssignments(ctx context.Context) ([]domain.TeacherClassAssignment, error) {
	return u.teacherRepo.GetAllAssignments(ctx)
}

func (u *teacherUseCase) ActivatePortalAccess(ctx context.Context, id uuid.UUID) (string, string, error) {
	teacher, err := u.teacherRepo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}

	if teacher.UserID != nil {
		user, _ := u.userRepo.GetByID(ctx, *teacher.UserID)
		if user != nil {
			return string(*user.Username), "ALREADY_ACTIVE", nil
		}
	}

	// Check if a user with this email already exists (handles partial failures / retries)
	existingByEmail, _ := u.userRepo.GetByIdentifier(ctx, string(teacher.Email))
	if existingByEmail != nil {
		// Link the orphaned user back to this teacher
		teacher.UserID = &existingByEmail.ID
		_ = u.teacherRepo.Update(ctx, teacher)
		return string(*existingByEmail.Username), "ALREADY_ACTIVE", nil
	}

	// 1. Generate Username (lowercase first name + check uniqueness)
	baseUsername := strings.ToLower(string(teacher.FirstName))
	username := baseUsername
	for i := 1; i < 100; i++ {
		existing, _ := u.userRepo.GetByIdentifier(ctx, username)
		if existing == nil {
			break
		}
		username = fmt.Sprintf("%s%d", baseUsername, 1000+i)
	}

	// 2. Generate Random Password
	password := generateRandomPassword(12)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// 3. Create User
	user := &domain.User{
		Email:    teacher.Email,
		Username: (*encryption.DeterministicEncryptedString)(&username),
		Password: string(hashedPassword),
		Role:     domain.RoleTeacher,
	}
	if err := u.userRepo.Create(ctx, user); err != nil {
		return "", "", err
	}

	// 4. Link Teacher
	teacher.UserID = &user.ID
	if err := u.teacherRepo.Update(ctx, teacher); err != nil {
		return "", "", err
	}

	// 5. Send Activation Email
	subject := "Welcome to your Teacher Portal"
	body := fmt.Sprintf(`
		<h2>Hello %s,</h2>
		<p>Your institutional portal access has been activated.</p>
		<p><strong>Username:</strong> %s</p>
		<p><strong>Temporary Password:</strong> %s</p>
		<p>Please log in and change your password immediately.</p>
	`, string(teacher.FirstName), username, password)
	
	_ = u.mailService.SendBulkHTML(ctx, subject, body, []string{string(teacher.Email)})

	return username, password, nil
}

func (u *teacherUseCase) ResetPassword(ctx context.Context, id uuid.UUID) (string, error) {
	teacher, err := u.teacherRepo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	if teacher.UserID == nil {
		return "", fmt.Errorf("teacher does not have an active portal account")
	}

	user, err := u.userRepo.GetByID(ctx, *teacher.UserID)
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
	`, string(teacher.FirstName), newPassword)

	_ = u.mailService.SendBulkHTML(ctx, subject, body, []string{string(teacher.Email)})

	return newPassword, nil
}

func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	b := make([]byte, length)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[num.Int64()]
	}
	return string(b)
}

