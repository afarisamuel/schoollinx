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
	fiscalRepo     domain.FiscalRepository
	academicRepo   domain.AcademicPeriodRepository
}

func NewStudentUseCase(
	repo domain.StudentRepository,
	gradeRepo domain.GradeRepository,
	attendanceRepo domain.AttendanceRepository,
	welfareRepo domain.WelfareRepository,
	userRepo domain.UserRepository,
	guardianRepo domain.GuardianRepository,
	mailService mailer.MailService,
	fiscalRepo domain.FiscalRepository,
	academicRepo domain.AcademicPeriodRepository,
) domain.StudentUseCase {
	return &studentUseCase{
		studentRepo:    repo,
		gradeRepo:      gradeRepo,
		attendanceRepo: attendanceRepo,
		welfareRepo:    welfareRepo,
		userRepo:       userRepo,
		guardianRepo:   guardianRepo,
		mailer:         mailService,
		fiscalRepo:     fiscalRepo,
		academicRepo:   academicRepo,
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
	if err := u.studentRepo.Create(ctx, student); err != nil {
		return err
	}

	// Automatically apply term fees if fee structures exist for the current active period
	u.applyTermFeesIfGenerated(ctx, student)

	return nil
}

func (u *studentUseCase) applyTermFeesIfGenerated(ctx context.Context, student *domain.Student) {
	if u.academicRepo == nil || u.fiscalRepo == nil || student == nil {
		return
	}

	// 1. Look up the active academic period
	period, err := u.academicRepo.GetActive(ctx)
	if err != nil || period == nil {
		return
	}

	// 2. Find the activated term by current_term number
	activeTerm := ""
	dueDate := time.Now().AddDate(0, 1, 0) // default: 30 days
	for _, t := range period.Terms {
		if t.TermNumber == period.CurrentTerm {
			activeTerm = t.Name
			if !t.EndDate.IsZero() {
				dueDate = t.EndDate
			}
			break
		}
	}

	// 3. Look up fee structures for this period
	structures, err := u.fiscalRepo.GetFeeStructuresByPeriod(ctx, period.ID)
	if err != nil || len(structures) == 0 {
		return
	}

	// 4. Prevent duplicates: Check if a TERM_FEE for this specific term already exists for the student
	existingRecords, err := u.fiscalRepo.GetByStudent(ctx, student.ID)
	if err == nil {
		for _, rec := range existingRecords {
			if rec.Category == domain.CategoryTermFee && rec.TermName == activeTerm {
				return // Fee already exists for this term
			}
		}
	}

	// 5. Calculate applicable fees
	var studentTotalFee float64
	var studentBreakdown []domain.FeeBreakdownItem

	for _, structure := range structures {
		if structure.IsTermFee == nil || !*structure.IsTermFee {
			continue
		}

		// Check if this fee structure applies to this student's class
		applies := false
		if structure.AllClasses || len(structure.ClassIDs) == 0 {
			applies = true
		} else if student.ClassID != nil {
			studentClassIDStr := student.ClassID.String()
			for _, cid := range structure.ClassIDs {
				if cid == studentClassIDStr {
					applies = true
					break
				}
			}
		}

		if applies {
			studentTotalFee += structure.Amount
			studentBreakdown = append(studentBreakdown, domain.FeeBreakdownItem{
				Category: structure.Category,
				Amount:   structure.Amount,
			})
		}
	}

	if len(studentBreakdown) == 0 || studentTotalFee <= 0 {
		return
	}

	// 6. Create fiscal record (best-effort)
	record := &domain.FiscalRecord{
		StudentID:   student.ID,
		Category:    domain.CategoryTermFee,
		Amount:      studentTotalFee,
		Description: "Term Fees — " + activeTerm,
		TermName:    activeTerm,
		Breakdown:   studentBreakdown,
		Status:      domain.PaymentStatusPending,
		DueDate:     dueDate,
	}

	if errCreate := u.fiscalRepo.Create(ctx, record); errCreate != nil {
		log.Printf("[StudentUseCase] Failed to auto-generate term fees for student %s: %v", student.ID, errCreate)
	}
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

func (u *studentUseCase) GetStudentsForTeacherPaginated(ctx context.Context, userID uuid.UUID, query domain.PaginationQuery) (int64, []domain.Student, error) {
	return u.studentRepo.GetStudentsForTeacherPaginated(ctx, userID, query)
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
