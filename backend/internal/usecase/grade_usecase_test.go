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

// --- Mock: GradeRepository ---
type mockGradeRepo struct{ mock.Mock }

func (m *mockGradeRepo) Create(ctx context.Context, g *domain.Grade) error {
	return m.Called(ctx, g).Error(0)
}
func (m *mockGradeRepo) GetAll(ctx context.Context) ([]domain.Grade, error) {
	args := m.Called(ctx); return args.Get(0).([]domain.Grade), args.Error(1)
}
func (m *mockGradeRepo) GetByStudentID(ctx context.Context, id uuid.UUID) ([]domain.Grade, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.Grade), args.Error(1)
}
func (m *mockGradeRepo) GetByClassID(ctx context.Context, id uuid.UUID) ([]domain.Grade, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.Grade), args.Error(1)
}
func (m *mockGradeRepo) Update(ctx context.Context, g *domain.Grade) error {
	return m.Called(ctx, g).Error(0)
}
func (m *mockGradeRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *mockGradeRepo) GetWeightsByClassID(ctx context.Context, id uuid.UUID) ([]domain.GradeWeight, error) {
	args := m.Called(ctx, id); return args.Get(0).([]domain.GradeWeight), args.Error(1)
}
func (m *mockGradeRepo) UpsertWeight(ctx context.Context, w *domain.GradeWeight) error {
	return m.Called(ctx, w).Error(0)
}
func (m *mockGradeRepo) GetWeightedGPA(ctx context.Context, id uuid.UUID) ([]domain.GradeWeightedGPA, error) {
	return nil, nil
}
func (m *mockGradeRepo) CurveGrades(ctx context.Context, classID uuid.UUID, term, method string, factor float64) error {
	return nil
}
func (m *mockGradeRepo) LogChange(ctx context.Context, log *domain.GradeLog) error { return nil }
func (m *mockGradeRepo) GetHistory(ctx context.Context, gradeID uuid.UUID) ([]domain.GradeLog, error) {
	return nil, nil
}
func (m *mockGradeRepo) BulkCreate(ctx context.Context, grades []domain.Grade) (int, []string, error) {
	args := m.Called(ctx, grades); return args.Int(0), args.Get(1).([]string), args.Error(2)
}
func (m *mockGradeRepo) GetGradeDistribution(ctx context.Context) (map[string]int, error) {
	args := m.Called(ctx); return args.Get(0).(map[string]int), args.Error(1)
}
func (m *mockGradeRepo) GetStudentGradeAverages(ctx context.Context) ([]domain.StudentGradeAverage, error) {
	args := m.Called(ctx); return args.Get(0).([]domain.StudentGradeAverage), args.Error(1)
}
func (m *mockGradeRepo) GetStudentGradeTrajectory(ctx context.Context, studentID uuid.UUID) ([]domain.GradeTrajectoryPoint, error) {
	args := m.Called(ctx, studentID); return args.Get(0).([]domain.GradeTrajectoryPoint), args.Error(1)
}

// --- Tests ---

func TestGradeUseCase_AddGrade(t *testing.T) {
	repo := new(mockGradeRepo)
	uc := usecase.NewGradeUseCase(repo, nil)

	grade := &domain.Grade{
		StudentID: uuid.New(),
		ClassID:   uuid.New(),
		Score:     95.5,
		Subject:   "Mathematics",
	}

	repo.On("Create", mock.Anything, grade).Return(nil)

	err := uc.AddGrade(context.Background(), grade)
	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestGradeUseCase_GetStudentGrades(t *testing.T) {
	repo := new(mockGradeRepo)
	uc := usecase.NewGradeUseCase(repo, nil)

	studentID := uuid.New()
	expected := []domain.Grade{
		{ID: uuid.New(), StudentID: studentID, Score: 88.0, Subject: "English"},
	}

	repo.On("GetByStudentID", mock.Anything, studentID).Return(expected, nil)

	result, err := uc.GetStudentGrades(context.Background(), studentID)
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, 88.0, float64(result[0].Score))
	repo.AssertExpectations(t)
}

func TestGradeUseCase_BulkCreateGrades(t *testing.T) {
	repo := new(mockGradeRepo)
	uc := usecase.NewGradeUseCase(repo, nil)

	grades := []domain.Grade{
		{StudentID: uuid.New(), Score: 75.0},
		{StudentID: uuid.New(), Score: 90.0},
	}

	repo.On("BulkCreate", mock.Anything, grades).Return(2, []string{}, nil)

	count, failures, err := uc.BulkCreateGrades(context.Background(), grades)
	assert.NoError(t, err)
	assert.Equal(t, 2, count)
	assert.Empty(t, failures)
	repo.AssertExpectations(t)
}
