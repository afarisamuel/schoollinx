package usecase_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

// --- Mock: AttendanceRepository ---
// mockStudentRepo is already defined in fiscal_usecase_test.go
// mockGradeRepo is already defined in grade_usecase_test.go

type mockAttendanceRepo struct{ mock.Mock }

func (m *mockAttendanceRepo) Create(ctx context.Context, a *domain.Attendance) error { return nil }
func (m *mockAttendanceRepo) BulkCreate(ctx context.Context, a []domain.Attendance) error {
	return nil
}
func (m *mockAttendanceRepo) GetByStudent(ctx context.Context, id uuid.UUID) ([]domain.Attendance, error) {
	return nil, nil
}
func (m *mockAttendanceRepo) GetByClassAndDate(ctx context.Context, id uuid.UUID, d string) ([]domain.Attendance, error) {
	return nil, nil
}
func (m *mockAttendanceRepo) GetAll(ctx context.Context) ([]domain.Attendance, error) {
	return nil, nil
}
func (m *mockAttendanceRepo) LogScanEvent(ctx context.Context, scan *domain.ScanEvent) error {
	return nil
}
func (m *mockAttendanceRepo) GetRecentScanEvents(ctx context.Context, limit int) ([]domain.ScanEvent, error) {
	return nil, nil
}

func (m *mockAttendanceRepo) RegisterDevice(ctx context.Context, device *domain.BiometricDevice) error {
	return nil
}
func (m *mockAttendanceRepo) UpdateDevice(ctx context.Context, device *domain.BiometricDevice) error {
	return nil
}
func (m *mockAttendanceRepo) DeleteDevice(ctx context.Context, id string) error {
	return nil
}
func (m *mockAttendanceRepo) GetDevices(ctx context.Context) ([]domain.BiometricDevice, error) {
	return nil, nil
}
func (m *mockAttendanceRepo) GetDeviceByID(ctx context.Context, id string) (*domain.BiometricDevice, error) {
	return nil, nil
}

func (m *mockAttendanceRepo) GetAttendanceStats(ctx context.Context) (map[string]int, error) {
	args := m.Called(ctx)
	return args.Get(0).(map[string]int), args.Error(1)
}

func (m *mockAttendanceRepo) GetStudentAttendanceStats(ctx context.Context) ([]domain.StudentAttendanceStat, error) {
	args := m.Called(ctx)
	return args.Get(0).([]domain.StudentAttendanceStat), args.Error(1)
}

// --- Tests ---

func TestAnalyticsUseCase_GetAttendanceStats(t *testing.T) {
	attendanceRepo := new(mockAttendanceRepo)
	uc := usecase.NewAnalyticsUseCase(attendanceRepo, new(mockGradeRepo), new(mockStudentRepo), nil, nil)

	statsMap := map[string]int{"Present": 10, "Absent": 2, "Tardy": 1}
	attendanceRepo.On("GetAttendanceStats", mock.Anything).Return(statsMap, nil)

	stats, err := uc.GetAttendanceStats(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, 10, stats.Present)
	assert.Equal(t, 2, stats.Absent)
	assert.Equal(t, 1, stats.Tardy)
	attendanceRepo.AssertExpectations(t)
}

func TestAnalyticsUseCase_GetGradeDistribution(t *testing.T) {
	gradeRepo := new(mockGradeRepo)
	uc := usecase.NewAnalyticsUseCase(new(mockAttendanceRepo), gradeRepo, new(mockStudentRepo), nil, nil)

	distMap := map[string]int{"A": 5, "B": 3, "C": 2, "D": 1, "F": 0}
	gradeRepo.On("GetGradeDistribution", mock.Anything).Return(distMap, nil)

	dist, err := uc.GetGradeDistribution(context.Background())
	assert.NoError(t, err)
	assert.Len(t, dist, 5)

	for _, d := range dist {
		if d.Label == "A" {
			assert.Equal(t, 5.0, d.Value)
		}
	}

	gradeRepo.AssertExpectations(t)
}
