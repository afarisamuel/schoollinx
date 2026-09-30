package usecase

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
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
	sms            domain.SMSProvider
	tenants        domain.TenantRepository
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
	sms domain.SMSProvider,
	tenants ...domain.TenantRepository,
) domain.StudentUseCase {
	var tenantRepo domain.TenantRepository
	if len(tenants) > 0 {
		tenantRepo = tenants[0]
	}
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
		sms:            sms,
		tenants:        tenantRepo,
	}
}

func (u *studentUseCase) resolveSenderID(ctx context.Context) string {
	tenantID, hasTenant := middleware.GetTenantIDFromContext(ctx)
	if hasTenant && tenantID != uuid.Nil && u.tenants != nil {
		if tenant, err := u.tenants.GetByID(ctx, tenantID); err == nil && tenant != nil {
			if tenant.SMSSenderID != "" {
				return tenant.SMSSenderID
			}
		}
	}
	return domain.DefaultSMSSenderID
}

func (u *studentUseCase) sendSMSWithFallback(ctx context.Context, phone string, message string) {
	if u.sms == nil || strings.TrimSpace(phone) == "" {
		return
	}
	cleanPhone := strings.TrimSpace(phone)
	primarySenderID := u.resolveSenderID(ctx)
	recipients := []string{cleanPhone}
	tenantID, _ := middleware.GetTenantIDFromContext(ctx)

	go func(sID string, recs []string, msg string, tID uuid.UUID) {
		bgCtx := context.Background()
		err := u.sms.SendSMS(bgCtx, sID, recs, msg)
		if err != nil {
			log.Printf("[STUDENT GUARDIAN SMS] Failed to send SMS via sender '%s' to %v: %v. Attempting fallback.", sID, recs, err)
			fallbackID := domain.DefaultSMSSenderID
			if sID == domain.DefaultSMSSenderID {
				if tID != uuid.Nil && u.tenants != nil {
					if t, _ := u.tenants.GetByID(bgCtx, tID); t != nil && t.SMSSenderID != "" {
						fallbackID = t.SMSSenderID
					}
				}
			}
			if fallbackID != sID {
				if fbErr := u.sms.SendSMS(bgCtx, fallbackID, recs, msg); fbErr != nil {
					log.Printf("[STUDENT GUARDIAN SMS] Fallback SMS via '%s' also failed to %v: %v", fallbackID, recs, fbErr)
				} else {
					log.Printf("[STUDENT GUARDIAN SMS] Fallback SMS via '%s' sent successfully to %v", fallbackID, recs)
				}
			}
		} else {
			log.Printf("[STUDENT GUARDIAN SMS] Credentials SMS successfully dispatched to %v via sender '%s'", recs, sID)
		}
	}(primarySenderID, recipients, message, tenantID)
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
		Email:              userEmail,
		Password:           hashedPassword,
		Role:               domain.RoleGuardian,
		MustChangePassword: true,
	}
	if hasPhone {
		cleanPhone := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.PhoneNumber)))
		phone := encryption.DeterministicEncryptedString(cleanPhone)
		newUser.PhoneNumber = &phone
		if !hasEmail {
			newUser.Username = &phone
		}
	}

	if err := u.userRepo.Create(ctx, newUser); err != nil {
		// If the failure is a duplicate key constraint (phone or email already exists),
		// fall back to linking the existing user account instead of failing the admission.
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			existing, lookupErr := u.userRepo.GetByIdentifier(ctx, identifier)
			if lookupErr == nil && existing != nil {
				log.Printf("[GUARDIAN] Phone/email '%s' already has an account — linking existing user %s\n", identifier, existing.ID)
				g.UserID = existing.ID
				return "", nil
			}
		}
		return "", fmt.Errorf("failed to create guardian user account: %w", err)
	}
	g.UserID = newUser.ID

	log.Printf("[GUARDIAN CREATED] Account provisioned for %s\n", identifier)

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

	if u.sms != nil && hasPhone && tempPassword != "" {
		phone := encryption.DeterministicDecryptedString(string(g.PhoneNumber))
		loginUsername := identifier
		if !hasEmail {
			loginUsername = phone
		}
		smsMsg := fmt.Sprintf("Welcome to SchoolLinx! Your Parent Portal account is active. Login: %s, Temp Password: %s. Please log in and change your password.", loginUsername, tempPassword)
		u.sendSMSWithFallback(ctx, phone, smsMsg)
	}

	return tempPassword, nil
}

func splitGuardianName(fullName string) (first string, last string) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return "", ""
	}
	parts := strings.Fields(fullName)
	if len(parts) == 1 {
		return parts[0], ""
	}
	return strings.Join(parts[:len(parts)-1], " "), parts[len(parts)-1]
}

func (u *studentUseCase) collectAndProvisionGuardians(ctx context.Context, student *domain.Student) error {
	var prospective []*domain.Guardian

	for _, g := range student.Guardians {
		if g != nil {
			prospective = append(prospective, g)
		}
	}

	hasGuardianWith := func(phone string, email string, rel string) bool {
		phone = strings.TrimSpace(phone)
		email = strings.TrimSpace(email)
		for _, g := range prospective {
			gPhone := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.PhoneNumber)))
			gEmail := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.Email)))
			if phone != "" && gPhone != "" && phone == gPhone {
				return true
			}
			if email != "" && gEmail != "" && strings.EqualFold(email, gEmail) {
				return true
			}
			if rel != "" && strings.EqualFold(g.Relationship, rel) && g.FirstName != "" {
				return true
			}
		}
		return false
	}

	// 1. Father Details
	fName := strings.TrimSpace(string(student.FatherName))
	fPhone := strings.TrimSpace(string(student.FatherPhone))
	fEmail := strings.TrimSpace(string(student.FatherEmail))
	if (fName != "" || fPhone != "" || fEmail != "") && !hasGuardianWith(fPhone, fEmail, "Father") {
		fn, ln := splitGuardianName(fName)
		if fn == "" {
			fn = "Father"
		}
		g := &domain.Guardian{
			FirstName:    encryption.EncryptedString(fn),
			LastName:     encryption.EncryptedString(ln),
			PhoneNumber:  encryption.EncryptedString(fPhone),
			Email:        encryption.DeterministicEncryptedString(fEmail),
			Relationship: "Father",
			IsPrimary:    len(prospective) == 0,
			CanPickup:    true,
		}
		prospective = append(prospective, g)
	}

	// 2. Mother Details
	mName := strings.TrimSpace(string(student.MotherName))
	mPhone := strings.TrimSpace(string(student.MotherPhone))
	mEmail := strings.TrimSpace(string(student.MotherEmail))
	if (mName != "" || mPhone != "" || mEmail != "") && !hasGuardianWith(mPhone, mEmail, "Mother") {
		fn, ln := splitGuardianName(mName)
		if fn == "" {
			fn = "Mother"
		}
		g := &domain.Guardian{
			FirstName:    encryption.EncryptedString(fn),
			LastName:     encryption.EncryptedString(ln),
			PhoneNumber:  encryption.EncryptedString(mPhone),
			Email:        encryption.DeterministicEncryptedString(mEmail),
			Relationship: "Mother",
			IsPrimary:    len(prospective) == 0,
			CanPickup:    true,
		}
		prospective = append(prospective, g)
	}

	// 3. Named Guardian Details
	gName := strings.TrimSpace(string(student.GuardianName))
	gPhone := strings.TrimSpace(string(student.GuardianPhone))
	gEmail := strings.TrimSpace(string(student.GuardianEmail))
	gRel := strings.TrimSpace(string(student.GuardianRelation))
	if gRel == "" {
		gRel = "Legal Guardian"
	}
	if (gName != "" || gPhone != "" || gEmail != "") && !hasGuardianWith(gPhone, gEmail, "") {
		fn, ln := splitGuardianName(gName)
		if fn == "" {
			fn = "Guardian"
		}
		g := &domain.Guardian{
			FirstName:    encryption.EncryptedString(fn),
			LastName:     encryption.EncryptedString(ln),
			PhoneNumber:  encryption.EncryptedString(gPhone),
			Email:        encryption.DeterministicEncryptedString(gEmail),
			Relationship: gRel,
			IsPrimary:    len(prospective) == 0,
			CanPickup:    true,
		}
		prospective = append(prospective, g)
	}

	// 4. Provision accounts and create/link each guardian
	var finalGuardians []*domain.Guardian
	for _, g := range prospective {
		phone := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.PhoneNumber)))
		email := strings.TrimSpace(encryption.DeterministicDecryptedString(string(g.Email)))
		if phone == "" && email == "" {
			continue
		}

		// 4a. Check if Guardian profile or User account already exists (by Phone or Email)
		var existingGuardian *domain.Guardian
		if u.guardianRepo != nil {
			existingGuardian, _ = u.guardianRepo.GetByPhoneOrEmail(ctx, phone, email)
		}

		if existingGuardian == nil && u.userRepo != nil {
			identifier := email
			if identifier == "" {
				identifier = phone
			}
			existingUser, _ := u.userRepo.GetByIdentifier(ctx, identifier)
			if existingUser != nil {
				g.UserID = existingUser.ID
				if u.guardianRepo != nil {
					existingGuardian, _ = u.guardianRepo.GetByUserID(ctx, existingUser.ID)
				}
			}
		}

		studentName := strings.TrimSpace(fmt.Sprintf("%s %s", string(student.FirstName), string(student.LastName)))
		if studentName == "" {
			studentName = "your child"
		}

		if existingGuardian != nil {
			// Parent ALREADY EXISTS! Reuse existing account and guardian record
			g.ID = existingGuardian.ID
			g.UserID = existingGuardian.UserID

			log.Printf("[STUDENT GUARDIAN] Found existing parent %s (User: %s) for student %s — linking ward\n",
				g.ID, g.UserID, studentName)

			// Notify parent via SMS that their new child/ward has been linked to their existing portal
			if u.sms != nil && phone != "" {
				parentName := strings.TrimSpace(fmt.Sprintf("%s %s",
					encryption.DeterministicDecryptedString(string(existingGuardian.FirstName)),
					encryption.DeterministicDecryptedString(string(existingGuardian.LastName)),
				))
				if parentName == "" {
					parentName = "Parent/Guardian"
				}
				smsMsg := fmt.Sprintf("Hello %s, your ward %s has been successfully linked to your SchoolLinx Parent Portal account. Log in with your phone (%s) to view their profile, grades, and attendance.", parentName, studentName, phone)
				u.sendSMSWithFallback(ctx, phone, smsMsg)
			}
		} else {
			// New parent: provision User account with credentials & create Guardian record
			if _, err := u.provisionGuardianUser(ctx, g); err != nil {
				log.Printf("[STUDENT GUARDIAN] Provision user warning for %s: %v", phone, err)
			}

			if g.ID == uuid.Nil {
				if g.UserID != uuid.Nil && u.guardianRepo != nil {
					existingG, _ := u.guardianRepo.GetByUserID(ctx, g.UserID)
					if existingG != nil {
						g.ID = existingG.ID
					}
				}
				if g.ID == uuid.Nil && u.guardianRepo != nil {
					if err := u.guardianRepo.Create(ctx, g); err != nil {
						log.Printf("[STUDENT GUARDIAN] Error saving guardian record: %v", err)
					}
				}
			}
		}

		finalGuardians = append(finalGuardians, g)
	}

	student.Guardians = finalGuardians
	return nil
}

func (u *studentUseCase) CreateStudent(ctx context.Context, student *domain.Student) error {
	student.CapitalizeNames()
	if err := u.collectAndProvisionGuardians(ctx, student); err != nil {
		return err
	}
	if err := u.studentRepo.Create(ctx, student); err != nil {
		return err
	}

	// Ensure all guardians are linked in join table
	if u.guardianRepo != nil && student.ID != uuid.Nil {
		for _, g := range student.Guardians {
			if g != nil && g.ID != uuid.Nil {
				_ = u.guardianRepo.LinkStudent(ctx, g.ID, student.ID)
			}
		}
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
	if activeTerm == "" && len(period.Terms) > 0 {
		activeTerm = period.Terms[0].Name
	}
	if activeTerm == "" {
		activeTerm = fmt.Sprintf("Term %d", period.CurrentTerm)
	}

	// 3. Look up fee structures for this period
	structures, err := u.fiscalRepo.GetFeeStructuresByPeriod(ctx, period.ID)
	if err != nil || len(structures) == 0 {
		return
	}

	// 4. Prevent duplicates: Check if a fee for this specific term already exists for the student
	existingRecords, err := u.fiscalRepo.GetByStudent(ctx, student.ID)
	if err == nil {
		for _, rec := range existingRecords {
			isFeeCategory := rec.Category == domain.CategoryTermFee || rec.Category == domain.CategoryTuition
			termMatches := false
			if rec.TermName != "" && activeTerm != "" {
				termMatches = strings.EqualFold(strings.TrimSpace(rec.TermName), strings.TrimSpace(activeTerm))
			}
			if !termMatches && activeTerm != "" && rec.Description != "" {
				termMatches = strings.Contains(strings.ToLower(rec.Description), strings.ToLower(activeTerm))
			}

			if isFeeCategory && termMatches {
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
	for i := range students {
		students[i].CapitalizeNames()
		for j, g := range students[i].Guardians {
			if _, err := u.provisionGuardianUser(ctx, g); err == nil {
				students[i].Guardians[j] = g
			}
		}
	}

	if err := u.studentRepo.BulkUpsert(ctx, students, batchSize); err != nil {
		return err
	}

	for i := range students {
		u.applyTermFeesIfGenerated(ctx, &students[i])
	}

	return nil
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
	student.CapitalizeNames()

	if err := u.collectAndProvisionGuardians(ctx, student); err != nil {
		log.Printf("[STUDENT UPDATE] collectAndProvisionGuardians error: %v", err)
	}

	// Ensure all guardians are linked to this student
	if u.guardianRepo != nil && student.ID != uuid.Nil {
		for _, g := range student.Guardians {
			if g != nil && g.ID != uuid.Nil {
				_ = u.guardianRepo.LinkStudent(ctx, g.ID, student.ID)
			}
		}
	}

	// Update the student's own scalar fields
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
