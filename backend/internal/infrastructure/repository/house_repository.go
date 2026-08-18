package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type houseRepository struct {
	db *gorm.DB
}

func NewHouseRepository(db *gorm.DB) domain.HouseRepository {
	return &houseRepository{db: db}
}

func (r *houseRepository) Create(ctx context.Context, house *domain.House) error {
	return r.db.WithContext(ctx).Create(house).Error
}

func (r *houseRepository) GetAll(ctx context.Context) ([]domain.House, error) {
	var houses []domain.House
	if err := r.db.WithContext(ctx).Find(&houses).Error; err != nil {
		return nil, err
	}
	return houses, nil
}

func (r *houseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.House, error) {
	var house domain.House
	if err := r.db.WithContext(ctx).First(&house, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &house, nil
}

func (r *houseRepository) Update(ctx context.Context, house *domain.House) error {
	return r.db.WithContext(ctx).Save(house).Error
}

func (r *houseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.House{}, "id = ?", id).Error
}

func (r *houseRepository) AssignStudent(ctx context.Context, member *domain.HouseMember) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "student_id"}, {Name: "tenant_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"house_id"}),
	}).Create(member).Error
}

func (r *houseRepository) GetStudentHouse(ctx context.Context, studentID uuid.UUID) (*domain.House, error) {
	var member domain.HouseMember
	if err := r.db.WithContext(ctx).Where("student_id = ?", studentID).First(&member).Error; err != nil {
		return nil, err
	}
	return r.GetByID(ctx, member.HouseID)
}

func (r *houseRepository) GetHouseMembers(ctx context.Context, houseID uuid.UUID) ([]domain.HouseMember, error) {
	var members []domain.HouseMember
	if err := r.db.WithContext(ctx).Where("house_id = ?", houseID).Find(&members).Error; err != nil {
		return nil, err
	}
	return members, nil
}

func (r *houseRepository) RemoveStudent(ctx context.Context, studentID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.HouseMember{}, "student_id = ?", studentID).Error
}

func (r *houseRepository) AddPoints(ctx context.Context, entry *domain.HousePointEntry) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *houseRepository) GetLeaderboard(ctx context.Context) ([]domain.House, error) {
	var houses []domain.House
	if err := r.db.WithContext(ctx).Find(&houses).Error; err != nil {
		return nil, err
	}

	// Aggregate points per house
	type pointResult struct {
		HouseID uuid.UUID
		Total   int64
	}
	var results []pointResult
	r.db.WithContext(ctx).Model(&domain.HousePointEntry{}).
		Select("house_id, COALESCE(SUM(points), 0) as total").
		Group("house_id").Scan(&results)

	// Aggregate member counts
	type memberCount struct {
		HouseID uuid.UUID
		Count   int64
	}
	var counts []memberCount
	r.db.WithContext(ctx).Model(&domain.HouseMember{}).
		Select("house_id, COUNT(*) as count").
		Group("house_id").Scan(&counts)

	pointMap := map[uuid.UUID]int64{}
	for _, r := range results {
		pointMap[r.HouseID] = r.Total
	}
	countMap := map[uuid.UUID]int64{}
	for _, c := range counts {
		countMap[c.HouseID] = c.Count
	}

	for i := range houses {
		houses[i].TotalPoints = pointMap[houses[i].ID]
		houses[i].MemberCount = countMap[houses[i].ID]
	}

	// Sort descending by points
	for i := 0; i < len(houses); i++ {
		for j := i + 1; j < len(houses); j++ {
			if houses[j].TotalPoints > houses[i].TotalPoints {
				houses[i], houses[j] = houses[j], houses[i]
			}
		}
	}
	for i := range houses {
		houses[i].Rank = i + 1
	}

	return houses, nil
}

func (r *houseRepository) GetHousePoints(ctx context.Context, houseID uuid.UUID) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&domain.HousePointEntry{}).
		Where("house_id = ?", houseID).
		Select("COALESCE(SUM(points), 0)").Scan(&total).Error
	return total, err
}
