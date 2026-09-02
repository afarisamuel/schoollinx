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
	classRepo   domain.ClassRepository
	subjectRepo domain.SubjectRepository
	mailService mailer.MailService
}

func NewTeacherUseCase(
	repo domain.TeacherRepository,
	userRepo domain.UserRepository,
	classRepo domain.ClassRepository,
	subjectRepo domain.SubjectRepository,
	mailService mailer.MailService,
) domain.TeacherUseCase {
	return &teacherUseCase{
		teacherRepo: repo,
		userRepo:    userRepo,
		classRepo:   classRepo,
		subjectRepo: subjectRepo,
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

func (u *teacherUseCase) SetClassMaster(ctx context.Context, classID uuid.UUID, teacherID *uuid.UUID) error {
	class, err := u.classRepo.GetByID(ctx, classID)
	if err != nil {
		return fmt.Errorf("class not found: %w", err)
	}
	class.TeacherID = teacherID
	return u.classRepo.Update(ctx, class)
}

func (u *teacherUseCase) GetSubjectAllocationRecommendations(ctx context.Context) (*domain.AllocationAuditReport, error) {
	teachers, err := u.teacherRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch teachers: %w", err)
	}

	classes, err := u.classRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch classes: %w", err)
	}

	subjects, err := u.subjectRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch subjects: %w", err)
	}

	assignments, err := u.teacherRepo.GetAllAssignments(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch assignments: %w", err)
	}

	// 1. Build Workload Maps
	workloadMap := make(map[uuid.UUID]*domain.TeacherWorkloadSummary)
	classesPerTeacher := make(map[uuid.UUID]map[uuid.UUID]bool)
	subjectsPerTeacher := make(map[uuid.UUID]map[uuid.UUID]bool)

	// Map of class master assignments
	classMasterMap := make(map[uuid.UUID][]string)
	for _, cls := range classes {
		if cls.TeacherID != nil {
			classMasterMap[*cls.TeacherID] = append(classMasterMap[*cls.TeacherID], cls.Name)
		}
	}

	for _, t := range teachers {
		classesPerTeacher[t.ID] = make(map[uuid.UUID]bool)
		subjectsPerTeacher[t.ID] = make(map[uuid.UUID]bool)

		var specialties []string
		for _, s := range t.Subjects {
			specialties = append(specialties, s.Name)
		}

		fullName := strings.TrimSpace(fmt.Sprintf("%s %s", string(t.FirstName), string(t.LastName)))
		if fullName == "" {
			fullName = "Educator"
		}

		masterClasses := classMasterMap[t.ID]

		workloadMap[t.ID] = &domain.TeacherWorkloadSummary{
			TeacherID:        t.ID,
			TeacherName:      fullName,
			Email:            string(t.Email),
			IsClassMaster:    len(masterClasses) > 0,
			ClassMasterOf:    masterClasses,
			Specialties:      specialties,
			Status:           domain.WorkloadStatusAvailable,
		}
	}

	// Map existing assignments
	assignedPairings := make(map[string]domain.TeacherClassAssignment)
	for _, a := range assignments {
		if a.SubjectID != nil {
			pairKey := fmt.Sprintf("%s:%s", a.ClassID.String(), a.SubjectID.String())
			assignedPairings[pairKey] = a
		}

		if _, exists := classesPerTeacher[a.TeacherID]; exists {
			classesPerTeacher[a.TeacherID][a.ClassID] = true
			if a.SubjectID != nil {
				subjectsPerTeacher[a.TeacherID][*a.SubjectID] = true
			}
		}
	}

	var underutilizedCount int
	var overloadedCount int
	var workloads []domain.TeacherWorkloadSummary

	for _, t := range teachers {
		w := workloadMap[t.ID]
		w.AssignedClasses = len(classesPerTeacher[t.ID])
		w.AssignedSubjects = len(subjectsPerTeacher[t.ID])
		w.TotalAssignments = len(classesPerTeacher[t.ID])

		switch {
		case w.TotalAssignments == 0:
			w.Status = domain.WorkloadStatusAvailable
			underutilizedCount++
		case w.TotalAssignments <= 5:
			w.Status = domain.WorkloadStatusOptimal
		case w.TotalAssignments <= 8:
			w.Status = domain.WorkloadStatusHeavy
		default:
			w.Status = domain.WorkloadStatusOverloaded
			overloadedCount++
		}
		workloads = append(workloads, *w)
	}

	// 2. Generate Recommendations for Unassigned Subjects
	var subjectRecs []domain.SubjectAllocationRecommendation
	var unassignedSubjectsCount int

	for _, cls := range classes {
		activeSubjects := cls.Subjects
		if len(activeSubjects) == 0 {
			activeSubjects = subjects
		}

		for _, subj := range activeSubjects {
			pairKey := fmt.Sprintf("%s:%s", cls.ID.String(), subj.ID.String())
			if _, exists := assignedPairings[pairKey]; exists {
				continue // Already assigned
			}

			unassignedSubjectsCount++

			var bestTeacher *domain.TeacherWorkloadSummary
			var confidence float64
			var rationale string
			var matchReason string

			subjNameLower := strings.ToLower(subj.Name)
			subjCodeLower := strings.ToLower(subj.Code)

			// Strategy 1: Subject Specialist Match
			for _, w := range workloads {
				if w.Status == domain.WorkloadStatusOverloaded {
					continue
				}
				for _, spec := range w.Specialties {
					specLower := strings.ToLower(spec)
					if strings.Contains(subjNameLower, specLower) || strings.Contains(specLower, subjNameLower) || (subjCodeLower != "" && specLower == subjCodeLower) {
						copyW := w
						bestTeacher = &copyW
						confidence = 0.95
						matchReason = "SPECIALTY_MATCH"
						rationale = fmt.Sprintf("Subject specialist in %s with %s workload (%d active classes).", subj.Name, strings.ToLower(string(w.Status)), w.AssignedClasses)
						break
					}
				}
				if bestTeacher != nil {
					break
				}
			}

			// Strategy 2: If Class has a Class Master with available capacity
			if bestTeacher == nil && cls.TeacherID != nil {
				if cmWorkload, ok := workloadMap[*cls.TeacherID]; ok && cmWorkload.Status != domain.WorkloadStatusOverloaded {
					bestTeacher = cmWorkload
					confidence = 0.85
					matchReason = "CLASS_MASTER_GENERALIST"
					rationale = fmt.Sprintf("Assigned Class Master for %s. Suitable for general cohort teaching.", cls.Name)
				}
			}

			// Strategy 3: Lowest workload available educator
			if bestTeacher == nil {
				var lowestTeacher *domain.TeacherWorkloadSummary
				minAssignments := 999
				for _, w := range workloads {
					if w.Status != domain.WorkloadStatusOverloaded && w.TotalAssignments < minAssignments {
						minAssignments = w.TotalAssignments
						copyW := w
						lowestTeacher = &copyW
					}
				}
				if lowestTeacher != nil {
					bestTeacher = lowestTeacher
					confidence = 0.70
					matchReason = "WORKLOAD_BALANCED"
					rationale = fmt.Sprintf("Faculty member with available capacity (%d assigned classes).", lowestTeacher.AssignedClasses)
				}
			}

			subjectRecs = append(subjectRecs, domain.SubjectAllocationRecommendation{
				ClassID:          cls.ID,
				ClassName:        cls.Name,
				SubjectID:        subj.ID,
				SubjectName:      subj.Name,
				SubjectCode:      subj.Code,
				SuggestedTeacher: bestTeacher,
				ConfidenceScore:  confidence,
				Rationale:        rationale,
				MatchReason:      matchReason,
			})
		}
	}

	// 3. Class Master Recommendations
	var classMasterRecs []domain.ClassMasterRecommendation
	var classesWithoutMasterCount int

	for _, cls := range classes {
		if cls.TeacherID == nil {
			classesWithoutMasterCount++

			var bestMaster *domain.TeacherWorkloadSummary
			var rationale string

			for _, w := range workloads {
				if w.IsClassMaster {
					continue
				}
				if classesPerTeacher[w.TeacherID][cls.ID] {
					copyW := w
					bestMaster = &copyW
					rationale = fmt.Sprintf("Already teaches subjects in %s and has no Form Master duties.", cls.Name)
					break
				}
			}

			if bestMaster == nil {
				for _, w := range workloads {
					if !w.IsClassMaster && w.Status != domain.WorkloadStatusOverloaded {
						copyW := w
						bestMaster = &copyW
						rationale = fmt.Sprintf("Available educator with %s workload (%d classes assigned).", strings.ToLower(string(w.Status)), w.AssignedClasses)
						break
					}
				}
			}

			classMasterRecs = append(classMasterRecs, domain.ClassMasterRecommendation{
				ClassID:          cls.ID,
				ClassName:        cls.Name,
				SuggestedTeacher: bestMaster,
				Rationale:        rationale,
			})
		}
	}

	return &domain.AllocationAuditReport{
		TotalTeachers:              len(teachers),
		TotalClasses:               len(classes),
		TotalSubjects:              len(subjects),
		TotalActiveAssignments:     len(assignments),
		UnassignedSubjectsCount:    unassignedSubjectsCount,
		ClassesWithoutMasterCount:  classesWithoutMasterCount,
		UnderutilizedTeachersCount: underutilizedCount,
		OverloadedTeachersCount:    overloadedCount,
		Workloads:                  workloads,
		SubjectRecommendations:     subjectRecs,
		ClassMasterRecommendations: classMasterRecs,
	}, nil
}


