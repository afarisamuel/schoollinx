package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type houseUseCase struct {
	repo domain.HouseRepository
}

func NewHouseUseCase(repo domain.HouseRepository) domain.HouseUseCase {
	return &houseUseCase{repo: repo}
}

func (u *houseUseCase) CreateHouse(ctx context.Context, house *domain.House) error {
	if house.ID == uuid.Nil {
		house.ID = uuid.New()
	}
	return u.repo.Create(ctx, house)
}

func (u *houseUseCase) GetAllHouses(ctx context.Context) ([]domain.House, error) {
	return u.repo.GetAll(ctx)
}

func (u *houseUseCase) UpdateHouse(ctx context.Context, house *domain.House) error {
	return u.repo.Update(ctx, house)
}

func (u *houseUseCase) DeleteHouse(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

func (u *houseUseCase) GetLeaderboard(ctx context.Context) ([]domain.House, error) {
	return u.repo.GetLeaderboard(ctx)
}

func (u *houseUseCase) AssignStudentToHouse(ctx context.Context, studentID, houseID uuid.UUID) error {
	member := &domain.HouseMember{
		ID:        uuid.New(),
		HouseID:   houseID,
		StudentID: studentID,
	}
	return u.repo.AssignStudent(ctx, member)
}

func (u *houseUseCase) GetStudentHouse(ctx context.Context, studentID uuid.UUID) (*domain.House, error) {
	return u.repo.GetStudentHouse(ctx, studentID)
}
