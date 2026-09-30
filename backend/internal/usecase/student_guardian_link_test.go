package usecase_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

type mockSiblingGuardianRepo struct {
	guardians []*domain.Guardian
	links     map[uuid.UUID][]uuid.UUID
}

func newMockSiblingGuardianRepo() *mockSiblingGuardianRepo {
	return &mockSiblingGuardianRepo{
		guardians: make([]*domain.Guardian, 0),
		links:     make(map[uuid.UUID][]uuid.UUID),
	}
}

func (m *mockSiblingGuardianRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Guardian, error) {
	for _, g := range m.guardians {
		if g.ID == id {
			return g, nil
		}
	}
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Guardian, error) {
	for _, g := range m.guardians {
		if g.UserID == userID {
			return g, nil
		}
	}
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetByPickupCode(ctx context.Context, code string) (*domain.Guardian, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetByPhoneOrEmail(ctx context.Context, phone string, email string) (*domain.Guardian, error) {
	for _, g := range m.guardians {
		gPhone := encryption.DeterministicDecryptedString(string(g.PhoneNumber))
		gEmail := encryption.DeterministicDecryptedString(string(g.Email))
		if phone != "" && gPhone == phone {
			return g, nil
		}
		if email != "" && gEmail == email {
			return g, nil
		}
	}
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetLinkedStudents(ctx context.Context, guardianID uuid.UUID) ([]domain.Student, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetForStudent(ctx context.Context, studentID uuid.UUID) ([]*domain.Guardian, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetAll(ctx context.Context) ([]domain.Guardian, error) {
	var result []domain.Guardian
	for _, g := range m.guardians {
		result = append(result, *g)
	}
	return result, nil
}

func (m *mockSiblingGuardianRepo) Create(ctx context.Context, guardian *domain.Guardian) error {
	if guardian.ID == uuid.Nil {
		guardian.ID = uuid.New()
	}
	m.guardians = append(m.guardians, guardian)
	return nil
}

func (m *mockSiblingGuardianRepo) Update(ctx context.Context, guardian *domain.Guardian) error {
	return nil
}

func (m *mockSiblingGuardianRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockSiblingGuardianRepo) LinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	m.links[guardianID] = append(m.links[guardianID], studentID)
	return nil
}

func (m *mockSiblingGuardianRepo) UnlinkStudent(ctx context.Context, guardianID uuid.UUID, studentID uuid.UUID) error {
	return nil
}

func (m *mockSiblingGuardianRepo) CreateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return nil
}

func (m *mockSiblingGuardianRepo) GetAbsenceRequestsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]domain.AbsenceRequest, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetAllAbsenceRequests(ctx context.Context) ([]domain.AbsenceRequest, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) GetAbsenceRequestByID(ctx context.Context, id uuid.UUID) (*domain.AbsenceRequest, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) UpdateAbsenceRequest(ctx context.Context, req *domain.AbsenceRequest) error {
	return nil
}

func (m *mockSiblingGuardianRepo) CreateTemporaryPickupOTP(ctx context.Context, otp *domain.TemporaryPickupOTP) error {
	return nil
}

func (m *mockSiblingGuardianRepo) GetValidPickupOTP(ctx context.Context, code string) (*domain.TemporaryPickupOTP, error) {
	return nil, nil
}

func (m *mockSiblingGuardianRepo) MarkPickupOTPUsed(ctx context.Context, id uuid.UUID) error {
	return nil
}

type mockSiblingStudentRepo struct {
	students []domain.Student
}

func (m *mockSiblingStudentRepo) Create(ctx context.Context, student *domain.Student) error {
	if student.ID == uuid.Nil {
		student.ID = uuid.New()
	}
	m.students = append(m.students, *student)
	return nil
}

func (m *mockSiblingStudentRepo) BulkUpsert(ctx context.Context, students []domain.Student, batchSize int) error {
	return nil
}
func (m *mockSiblingStudentRepo) Update(ctx context.Context, student *domain.Student) error {
	return nil
}
func (m *mockSiblingStudentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockSiblingStudentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Student, error) {
	for _, s := range m.students {
		if s.ID == id {
			return &s, nil
		}
	}
	return nil, nil
}
func (m *mockSiblingStudentRepo) GetAll(ctx context.Context) ([]domain.Student, error) {
	return m.students, nil
}
func (m *mockSiblingStudentRepo) GetAllPaginated(ctx context.Context, query domain.PaginationQuery) (int64, []domain.Student, error) {
	return int64(len(m.students)), m.students, nil
}
func (m *mockSiblingStudentRepo) GetStudentsForTeacherPaginated(ctx context.Context, userID uuid.UUID, query domain.PaginationQuery) (int64, []domain.Student, error) {
	return 0, nil, nil
}
func (m *mockSiblingStudentRepo) GetByClass(ctx context.Context, classID uuid.UUID) ([]domain.Student, error) {
	return nil, nil
}
func (m *mockSiblingStudentRepo) BatchUpdateEnrollment(ctx context.Context, studentIDs []uuid.UUID, classID uuid.UUID) error {
	return nil
}
func (m *mockSiblingStudentRepo) GetAlumni(ctx context.Context) ([]domain.Student, error) {
	return nil, nil
}
func (m *mockSiblingStudentRepo) GetAlumniProfile(ctx context.Context, studentID uuid.UUID) (*domain.AlumniProfile, error) {
	return nil, nil
}
func (m *mockSiblingStudentRepo) SaveAlumniProfile(ctx context.Context, profile *domain.AlumniProfile) error {
	return nil
}
func (m *mockSiblingStudentRepo) BulkPromote(ctx context.Context, studentIDs []uuid.UUID, nextAcademicYear string) error {
	return nil
}

func (m *mockSiblingStudentRepo) GetByEnrollmentNumber(ctx context.Context, enrollmentNum string) (*domain.Student, error) {
	return nil, nil
}
func (m *mockSiblingStudentRepo) AppendGuardian(ctx context.Context, studentID uuid.UUID, guardian *domain.Guardian) error {
	return nil
}

type mockSiblingUserRepo struct {
	users []*domain.User
}

func (m *mockSiblingUserRepo) Create(ctx context.Context, user *domain.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	m.users = append(m.users, user)
	return nil
}

func (m *mockSiblingUserRepo) GetByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	for _, u := range m.users {
		if u.Email == encryption.DeterministicEncryptedString(identifier) {
			return u, nil
		}
		if u.PhoneNumber != nil && encryption.DeterministicDecryptedString(string(*u.PhoneNumber)) == identifier {
			return u, nil
		}
	}
	return nil, nil
}
func (m *mockSiblingUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return nil, nil
}
func (m *mockSiblingUserRepo) GetBySetupToken(ctx context.Context, token string) (*domain.User, error) {
	return nil, nil
}
func (m *mockSiblingUserRepo) GetByResetToken(ctx context.Context, token string) (*domain.User, error) {
	return nil, nil
}
func (m *mockSiblingUserRepo) Update(ctx context.Context, user *domain.User) error {
	return nil
}
func (m *mockSiblingUserRepo) GetByRole(ctx context.Context, role domain.Role) ([]domain.User, error) {
	return nil, nil
}
func (m *mockSiblingUserRepo) GetAll(ctx context.Context) ([]domain.User, error) {
	return nil, nil
}

func TestRegisterMultipleChildrenSameParent(t *testing.T) {
	studentRepo := &mockSiblingStudentRepo{}
	guardianRepo := newMockSiblingGuardianRepo()
	userRepo := &mockSiblingUserRepo{}

	studentUC := usecase.NewStudentUseCase(
		studentRepo,
		nil, nil, nil,
		userRepo,
		guardianRepo,
		nil, nil, nil, nil,
	)

	parentPhone := "0245678901"
	parentName := "Kwame Mensah"

	// 1. Create First Child (Kofi)
	child1 := &domain.Student{
		FirstName:   "Kofi",
		LastName:    "Mensah",
		FatherName:  encryption.EncryptedString(parentName),
		FatherPhone: encryption.EncryptedString(parentPhone),
	}

	err := studentUC.CreateStudent(context.Background(), child1)
	if err != nil {
		t.Fatalf("Failed to create child 1: %v", err)
	}

	if len(userRepo.users) != 1 {
		t.Fatalf("Expected 1 parent user account created, got %d", len(userRepo.users))
	}
	if len(guardianRepo.guardians) != 1 {
		t.Fatalf("Expected 1 guardian record created, got %d", len(guardianRepo.guardians))
	}
	createdGuardianID := guardianRepo.guardians[0].ID

	// 2. Create Second Child (Ama) with the exact same Father phone number
	child2 := &domain.Student{
		FirstName:   "Ama",
		LastName:    "Mensah",
		FatherName:  encryption.EncryptedString(parentName),
		FatherPhone: encryption.EncryptedString(parentPhone),
	}

	err = studentUC.CreateStudent(context.Background(), child2)
	if err != nil {
		t.Fatalf("Failed to create child 2: %v", err)
	}

	// Verify: NO duplicate user account or guardian record should have been created!
	if len(userRepo.users) != 1 {
		t.Fatalf("Expected still 1 parent user account, got %d", len(userRepo.users))
	}
	if len(guardianRepo.guardians) != 1 {
		t.Fatalf("Expected still 1 guardian record, got %d", len(guardianRepo.guardians))
	}

	// Verify both students are linked to the same guardian
	linkedStudents := guardianRepo.links[createdGuardianID]
	if len(linkedStudents) != 2 {
		t.Fatalf("Expected guardian to be linked to 2 students, got %d (%v)", len(linkedStudents), linkedStudents)
	}
	if linkedStudents[0] != child1.ID || linkedStudents[1] != child2.ID {
		t.Fatalf("Expected linked student IDs [%s, %s], got %v", child1.ID, child2.ID, linkedStudents)
	}
}
