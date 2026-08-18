package usecase

import (
	"context"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"github.com/user/high-school-management/backend/pkg/utils"
)

type studentUseCase struct {
	studentRepo    domain.StudentRepository
	gradeRepo      domain.GradeRepository
	attendanceRepo domain.AttendanceRepository
	welfareRepo    domain.WelfareRepository
	userRepo       domain.UserRepository
	guardianRepo   domain.GuardianRepository
	mailer         mailer.MailService
}

func NewStudentUseCase(repo domain.StudentRepository, gradeRepo domain.GradeRepository, attendanceRepo domain.AttendanceRepository, welfareRepo domain.WelfareRepository, userRepo domain.UserRepository, guardianRepo domain.GuardianRepository, mailService mailer.MailService) domain.StudentUseCase {
	return &studentUseCase{
		studentRepo:    repo,
		gradeRepo:      gradeRepo,
		attendanceRepo: attendanceRepo,
		welfareRepo:    welfareRepo,
		userRepo:       userRepo,
		guardianRepo:   guardianRepo,
		mailer:         mailService,
	}
}

// provisionGuardianUser ensures the given guardian has a User account.
// It checks by email (or phone if no email) and creates a new User if one doesn't exist.
// Returns the generated plaintext password if a new user was created (empty string if user already existed).
func (u *studentUseCase) provisionGuardianUser(ctx context.Context, g *domain.Guardian) (plaintextPwd string, err error) {
	hasEmail := string(g.Email) != ""
	hasPhone := string(g.PhoneNumber) != ""

	if !hasEmail && !hasPhone {
		// Nothing to identify this guardian with — skip account creation.
		return "", nil
	}

	// Choose the lookup identifier
	identifier := ""
	if hasEmail {
		identifier = encryption.DeterministicDecryptedString(string(g.Email))
	} else {
		identifier = encryption.DeterministicDecryptedString(string(g.PhoneNumber))
	}

	existingUser, _ := u.userRepo.GetByIdentifier(ctx, identifier)
	if existingUser != nil {
		// Already has an account — just link it.
		g.UserID = existingUser.ID
		return "", nil
	}

	// Generate temporary password
	tempPassword := utils.GenerateRandomPassword(10)
	hashedPassword, err := utils.HashPassword(tempPassword)
	if err != nil {
		return "", err
	}

	// If no real email, generate a hidden placeholder so the NOT NULL constraint is satisfied.
	// They will log in with their phone number, so this is never exposed.
	userEmail := g.Email
	if !hasEmail {
		ph := encryption.DeterministicDecryptedString(string(g.PhoneNumber))
		userEmail = encryption.DeterministicEncryptedString(fmt.Sprintf("phone_%s@no-email.local", ph))
	}

	newUser := &domain.User{
		Email:    userEmail,
		Password: hashedPassword,
		Role:     domain.RoleGuardian,
	}
	if hasPhone {
		phone := encryption.DeterministicEncryptedString(string(g.PhoneNumber))
		newUser.PhoneNumber = &phone
	}

	if err := u.userRepo.Create(ctx, newUser); err != nil {
		return "", fmt.Errorf("failed to create guardian user account: %w", err)
	}
	g.UserID = newUser.ID

	// Always log the credentials to the server console so admins can see it,
	// especially useful if the guardian only provided a phone number.
	log.Printf("[GUARDIAN CREATED] Email/Phone: %s | Temporary Password: %s\n", identifier, tempPassword)

	// Email credentials only if we have a real email address.
	if hasEmail {
		decryptedEmail := encryption.DeterministicDecryptedString(string(g.Email))
		subject := "Welcome to School Linx Parent Portal"
		body := fmt.Sprintf(`
			<h1>Welcome to School Linx</h1>
			<p>An account has been created for you to access the Parent Portal.</p>
			<p><strong>Login Email:</strong> %s</p>
			<p><strong>Temporary Password:</strong> %s</p>
			<p>Please log in and change your password as soon as possible.</p>
		`, decryptedEmail, tempPassword)
		_ = u.mailer.SendBulkHTML(ctx, subject, body, []string{decryptedEmail}) // best-effort
	}

	return tempPassword, nil
}

func (u *studentUseCase) CreateStudent(ctx context.Context, student *domain.Student) error {
	for i, g := range student.Guardians {
		if _, err := u.provisionGuardianUser(ctx, g); err != nil {
			return err
		}
		student.Guardians[i] = g
	}
	return u.studentRepo.Create(ctx, student)
}

func (u *studentUseCase) BulkUpsertStudents(ctx context.Context, students []domain.Student, batchSize int) error {
	return u.studentRepo.BulkUpsert(ctx, students, batchSize)
}

func (u *studentUseCase) GetStudentByID(ctx context.Context, id uuid.UUID) (*domain.Student, error) {
	return u.studentRepo.GetByID(ctx, id)
}

func (u *studentUseCase) GetAllStudents(ctx context.Context) ([]domain.Student, error) {
	return u.studentRepo.GetAll(ctx)
}

func (u *studentUseCase) GetAllStudentsPaginated(ctx context.Context, query domain.PaginationQuery) (int64, []domain.Student, error) {
	return u.studentRepo.GetAllPaginated(ctx, query)
}

func (u *studentUseCase) UpdateStudent(ctx context.Context, student *domain.Student) error {
	// Only process guardian changes if the payload includes guardian data.
	if len(student.Guardians) > 0 {
		incoming := student.Guardians[0] // treat the first entry as the primary guardian

		// Fetch guardians currently linked to this student from the DB.
		existing, err := u.guardianRepo.GetForStudent(ctx, student.ID)
		if err != nil {
			return fmt.Errorf("failed to fetch existing guardians: %w", err)
		}

		if len(existing) > 0 {
			// --- UPDATE path: a guardian is already linked ---
			// Merge the incoming details onto the first existing guardian record.
			linked := existing[0]
			if incoming.FirstName != "" {
				linked.FirstName = incoming.FirstName
			}
			if incoming.LastName != "" {
				linked.LastName = incoming.LastName
			}
			if incoming.PhoneNumber != "" {
				linked.PhoneNumber = incoming.PhoneNumber
			}
			if incoming.Email != "" {
				linked.Email = incoming.Email
			}
			if incoming.Relationship != "" {
				linked.Relationship = incoming.Relationship
			}
			if err := u.guardianRepo.Update(ctx, linked); err != nil {
				return fmt.Errorf("failed to update guardian: %w", err)
			}
		} else {
			// --- CREATE path: student has no guardian yet ---
			// Provision a user account (creates User + optional email).
			if _, err := u.provisionGuardianUser(ctx, incoming); err != nil {
				return err
			}
			// Persist the new guardian row.
			if err := u.guardianRepo.Create(ctx, incoming); err != nil {
				return fmt.Errorf("failed to create guardian: %w", err)
			}
			// Link the new guardian to this student in the join table.
			if err := u.studentRepo.AppendGuardian(ctx, student.ID, incoming); err != nil {
				return fmt.Errorf("failed to link guardian to student: %w", err)
			}
		}
	}

	// Update the student's own scalar fields (guardian association untouched by the repo).
	return u.studentRepo.Update(ctx, student)
}

func (u *studentUseCase) DeleteStudent(ctx context.Context, id uuid.UUID) error {
	return u.studentRepo.Delete(ctx, id)
}

func (u *studentUseCase) EnrollStudents(ctx context.Context, studentIDs []uuid.UUID, classID uuid.UUID) error {
	return u.studentRepo.BatchUpdateEnrollment(ctx, studentIDs, classID)
}

func (u *studentUseCase) GetStudentsByClass(ctx context.Context, classID uuid.UUID) ([]domain.Student, error) {
	return u.studentRepo.GetByClass(ctx, classID)
}

func (u *studentUseCase) GraduateStudent(ctx context.Context, studentID uuid.UUID, profile *domain.AlumniProfile) error {
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return err
	}

	now := time.Now()
	student.Status = domain.StatusAlumni
	student.GraduationDate = &now

	if err := u.studentRepo.Update(ctx, student); err != nil {
		return err
	}

	profile.StudentID = studentID
	profile.UpdatedAt = now
	return u.studentRepo.SaveAlumniProfile(ctx, profile)
}

func (u *studentUseCase) ListAlumni(ctx context.Context) ([]domain.Student, error) {
	return u.studentRepo.GetAlumni(ctx)
}

func (u *studentUseCase) GetAlumniLegacy(ctx context.Context, studentID uuid.UUID) (*domain.Student, *domain.AlumniProfile, error) {
	student, err := u.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		return nil, nil, err
	}

	profile, err := u.studentRepo.GetAlumniProfile(ctx, studentID)
	if err != nil {
		return student, nil, nil
	}

	return student, profile, nil
}
func (u *studentUseCase) PromoteStudents(ctx context.Context, studentIDs []uuid.UUID, nextAcademicYear string) error {
	return u.studentRepo.BulkPromote(ctx, studentIDs, nextAcademicYear)
}

func (u *studentUseCase) GetStudentTimeline(ctx context.Context, id uuid.UUID) ([]domain.TimelineEvent, error) {
	var events []domain.TimelineEvent

	// 1. Fetch Grades
	if u.gradeRepo != nil {
		grades, err := u.gradeRepo.GetByStudentID(ctx, id)
		if err == nil {
			for _, g := range grades {
				events = append(events, domain.TimelineEvent{
					ID:          g.ID,
					Type:        "grade",
					Title:       fmt.Sprintf("Grade Logged: %s", g.Subject),
					Description: fmt.Sprintf("Scored %.1f / %.1f in %s", g.Score, g.MaxScore, g.Category),
					Date:        g.CreatedAt, // Or AssessmentDate if available
					Metadata: map[string]interface{}{
						"subject": g.Subject,
						"score":   g.Score,
						"term":    g.Term,
					},
				})
			}
		}
	}

	// 2. Fetch Attendance
	if u.attendanceRepo != nil {
		attendances, err := u.attendanceRepo.GetByStudent(ctx, id)
		if err == nil {
			for _, a := range attendances {
				if a.Status != domain.StatusPresent { // Only flag non-present for timeline significance usually, but let's log all
					events = append(events, domain.TimelineEvent{
						ID:          a.ID,
						Type:        "attendance",
						Title:       fmt.Sprintf("Attendance: %s", a.Status),
						Description: a.Remarks,
						Date:        a.Date,
						Metadata: map[string]interface{}{
							"status": string(a.Status),
						},
					})
				}
			}
		}
	}

	// 3. Fetch Welfare/Behavior
	if u.welfareRepo != nil {
		behaviors, err := u.welfareRepo.GetBehaviorLogs(ctx, id)
		if err == nil {
			for _, b := range behaviors {
				events = append(events, domain.TimelineEvent{
					ID:          b.ID,
					Type:        "welfare",
					Title:       fmt.Sprintf("Behavior (%s): %s", b.Type, b.Category),
					Description: b.Description,
					Date:        b.Date,
					Metadata: map[string]interface{}{
						"action_taken": b.ActionTaken,
						"type":         b.Type,
					},
				})
			}
		}
	}

	// 4. Sort events descending by Date
	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.After(events[j].Date)
	})

	return events, nil
}
