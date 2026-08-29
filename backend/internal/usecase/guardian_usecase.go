package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"golang.org/x/crypto/bcrypt"
)

type guardianUseCase struct {
	guardianRepo domain.GuardianRepository
	studentRepo  domain.StudentRepository
	fiscalRepo   domain.FiscalRepository
	userRepo     domain.UserRepository
	mailService  mailer.MailService
}

func NewGuardianUseCase(repo domain.GuardianRepository, studentRepo domain.StudentRepository, fiscalRepo domain.FiscalRepository, userRepo domain.UserRepository, mailService mailer.MailService) domain.GuardianUseCase {
	return &guardianUseCase{
		guardianRepo: repo,
		studentRepo:  studentRepo,
		fiscalRepo:   fiscalRepo,
		userRepo:     userRepo,
		mailService:  mailService,
	}
}

func (u *guardianUseCase) GetAllGuardians(ctx context.Context) ([]domain.Guardian, error) {
	return u.guardianRepo.GetAll(ctx)
}

func (u *guardianUseCase) GetGuardianByID(ctx context.Context, id uuid.UUID) (*domain.Guardian, error) {
	return u.guardianRepo.GetByID(ctx, id)
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

func (u *guardianUseCase) CreateGuardian(ctx context.Context, guardian *domain.Guardian) (string, error) {
	hasEmail := string(guardian.Email) != ""
	hasPhone := string(guardian.PhoneNumber) != ""

	if !hasEmail && !hasPhone {
		return "", errors.New("either email or phone number is required to provision portal access")
	}

	var identifier string
	if hasEmail {
		identifier = encryption.DeterministicDecryptedString(string(guardian.Email))
	} else {
		identifier = encryption.DeterministicDecryptedString(string(guardian.PhoneNumber))
	}

	var tempPassword string
	existingUser, _ := u.userRepo.GetByIdentifier(ctx, identifier)
	if existingUser != nil {
		guardian.UserID = existingUser.ID
	} else {
		tempPassword = generateRandomPassword(10)
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
		if err != nil {
			return "", fmt.Errorf("failed to hash password: %w", err)
		}

		userEmail := guardian.Email
		if !hasEmail {
			ph := encryption.DeterministicDecryptedString(string(guardian.PhoneNumber))
			userEmail = encryption.DeterministicEncryptedString(fmt.Sprintf("phone_%s@no-email.local", ph))
		}

		newUser := &domain.User{
			Email:              userEmail,
			Password:           string(hashedPassword),
			Role:               domain.RoleGuardian,
			MustChangePassword: true,
		}
		if hasPhone {
			phone := encryption.DeterministicEncryptedString(string(guardian.PhoneNumber))
			newUser.PhoneNumber = &phone
		}

		if err := u.userRepo.Create(ctx, newUser); err != nil {
			return "", fmt.Errorf("failed to create user account: %w", err)
		}
		guardian.UserID = newUser.ID

		if hasEmail {
			subject := "Welcome to School Linx Parent Portal"
			body := fmt.Sprintf(`
				<h2>Welcome to School Linx, %s!</h2>
				<p>Your Parent Portal account has been created.</p>
				<p><strong>Username / Email:</strong> %s</p>
				<p><strong>Temporary Password:</strong> %s</p>
				<p>Please log in and update your password.</p>
			`, string(guardian.FirstName), identifier, tempPassword)
			_ = u.mailService.SendBulkHTML(ctx, subject, body, []string{identifier})
		}
	}

	if err := u.guardianRepo.Create(ctx, guardian); err != nil {
		return "", fmt.Errorf("failed to create guardian: %w", err)
	}

	return tempPassword, nil
}

func (u *guardianUseCase) UpdateGuardian(ctx context.Context, guardian *domain.Guardian) error {
	return u.guardianRepo.Update(ctx, guardian)
}

func (u *guardianUseCase) DeleteGuardian(ctx context.Context, id uuid.UUID) error {
	return u.guardianRepo.Delete(ctx, id)
}

func (u *guardianUseCase) LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	return u.guardianRepo.LinkStudent(ctx, guardianID, studentID)
}

func (u *guardianUseCase) UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	return u.guardianRepo.UnlinkStudent(ctx, guardianID, studentID)
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

func (u *guardianUseCase) GetFamilyLedger(ctx context.Context, guardianID uuid.UUID) (*domain.FamilyLedgerSummary, error) {
	guardian, err := u.guardianRepo.GetByID(ctx, guardianID)
	if err != nil || guardian == nil {
		guardian, err = u.guardianRepo.GetByUserID(ctx, guardianID)
		if err != nil || guardian == nil {
			return nil, errors.New("guardian not found")
		}
	}

	students, err := u.guardianRepo.GetLinkedStudents(ctx, guardian.ID)
	if err != nil {
		return nil, err
	}

	summary := &domain.FamilyLedgerSummary{
		GuardianID:   guardian.ID,
		GuardianName: fmt.Sprintf("%s %s", string(guardian.FirstName), string(guardian.LastName)),
		TotalWards:   len(students),
		Wards:        make([]domain.FamilyMemberFee, 0),
	}

	for _, s := range students {
		records, _ := u.fiscalRepo.GetByStudent(ctx, s.ID)
		var studentBilled, studentPaid, studentBalance float64
		for _, r := range records {
			studentBilled += r.Amount
			studentPaid += r.AmountPaid
			studentBalance += (r.Amount - r.AmountPaid)
		}

		className := "Unassigned"
		if s.Class != nil && s.Class.Name != "" {
			className = s.Class.Name
		}

		summary.Wards = append(summary.Wards, domain.FamilyMemberFee{
			StudentID:   s.ID,
			StudentName: fmt.Sprintf("%s %s", string(s.FirstName), string(s.LastName)),
			ClassName:   className,
			TotalBilled: studentBilled,
			TotalPaid:   studentPaid,
			BalanceDue:  studentBalance,
		})

		summary.TotalFamilyBilled += studentBilled
		summary.TotalFamilyPaid += studentPaid
		summary.TotalFamilyBalance += studentBalance
	}

	// Sibling discount logic (e.g. 10% discount for families with 2+ wards)
	if len(students) >= 2 {
		summary.SiblingDiscountPct = 10.0
	}

	return summary, nil
}

func (u *guardianUseCase) VerifyPickupPass(ctx context.Context, code string) (*domain.Guardian, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.New("pickup code is required")
	}
	return u.guardianRepo.GetByPickupCode(ctx, strings.TrimSpace(code))
}

func (u *guardianUseCase) SubmitAbsenceRequest(ctx context.Context, guardianUserID uuid.UUID, req *domain.AbsenceRequest) error {
	guardian, err := u.guardianRepo.GetByUserID(ctx, guardianUserID)
	if err != nil || guardian == nil {
		return errors.New("guardian profile not found")
	}

	req.GuardianID = guardian.ID
	req.Status = domain.AbsenceStatusPending
	return u.guardianRepo.CreateAbsenceRequest(ctx, req)
}

func (u *guardianUseCase) GetAbsenceRequestsForGuardian(ctx context.Context, guardianUserID uuid.UUID) ([]domain.AbsenceRequest, error) {
	guardian, err := u.guardianRepo.GetByUserID(ctx, guardianUserID)
	if err != nil || guardian == nil {
		return nil, errors.New("guardian profile not found")
	}
	return u.guardianRepo.GetAbsenceRequestsByGuardian(ctx, guardian.ID)
}

func (u *guardianUseCase) GetAllAbsenceRequests(ctx context.Context) ([]domain.AbsenceRequest, error) {
	return u.guardianRepo.GetAllAbsenceRequests(ctx)
}

func (u *guardianUseCase) ReviewAbsenceRequest(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, status domain.AbsenceStatus, notes string) error {
	req, err := u.guardianRepo.GetAbsenceRequestByID(ctx, id)
	if err != nil || req == nil {
		return errors.New("absence request not found")
	}

	req.Status = status
	req.ReviewedBy = &reviewerID
	req.ReviewNotes = notes
	return u.guardianRepo.UpdateAbsenceRequest(ctx, req)
}

func (u *guardianUseCase) BulkImportGuardians(ctx context.Context, csvData []byte) (int, int, error) {
	reader := csv.NewReader(bytes.NewReader(csvData))
	rows, err := reader.ReadAll()
	if err != nil {
		return 0, 0, fmt.Errorf("invalid CSV format: %w", err)
	}

	if len(rows) < 2 {
		return 0, 0, errors.New("CSV contains no data rows")
	}

	headerMap := make(map[string]int)
	for i, col := range rows[0] {
		headerMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	imported := 0
	skipped := 0

	for _, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}

		getVal := func(key string) string {
			if idx, ok := headerMap[key]; ok && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
			return ""
		}

		firstName := getVal("first_name")
		lastName := getVal("last_name")
		phone := getVal("phone_number")
		email := getVal("email")
		relationship := getVal("relationship")
		if relationship == "" {
			relationship = "Parent"
		}
		enrollmentNum := getVal("student_enrollment_num")

		if firstName == "" || lastName == "" || (phone == "" && email == "") {
			skipped++
			continue
		}

		guardian := &domain.Guardian{
			FirstName:    encryption.EncryptedString(firstName),
			LastName:     encryption.EncryptedString(lastName),
			Relationship: relationship,
			IsPrimary:    true,
			CanPickup:    true,
		}
		if phone != "" {
			guardian.PhoneNumber = encryption.EncryptedString(phone)
		}
		if email != "" {
			guardian.Email = encryption.DeterministicEncryptedString(email)
		}

		_, err := u.CreateGuardian(ctx, guardian)
		if err != nil {
			skipped++
			continue
		}

		imported++

		// Link student if enrollment number is provided
		if enrollmentNum != "" {
			student, _ := u.studentRepo.GetByEnrollmentNumber(ctx, enrollmentNum)
			if student != nil {
				_ = u.guardianRepo.LinkStudent(ctx, guardian.ID, student.ID)
			}
		}
	}

	return imported, skipped, nil
}

func (u *guardianUseCase) SendPortalInvites(ctx context.Context) (int, error) {
	guardians, err := u.guardianRepo.GetAll(ctx)
	if err != nil {
		return 0, err
	}

	sent := 0
	for _, g := range guardians {
		if string(g.Email) != "" {
			_, err := u.ResetPassword(ctx, g.ID)
			if err == nil {
				sent++
			}
		}
	}

	return sent, nil
}
