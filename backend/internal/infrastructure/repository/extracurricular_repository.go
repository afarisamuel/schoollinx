package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type extracurricularRepository struct {
	db *gorm.DB
}

func NewExtracurricularRepository(db *gorm.DB) domain.ExtracurricularRepository {
	return &extracurricularRepository{db: db}
}

func (r *extracurricularRepository) CreateClub(ctx context.Context, club *domain.Club) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(club).Error
}

func (r *extracurricularRepository) GetAllClubs(ctx context.Context) ([]domain.Club, error) {
	var clubs []domain.Club
	if r.db == nil {
		return clubs, nil
	}
	err := r.db.WithContext(ctx).Find(&clubs).Error
	return clubs, err
}

func (r *extracurricularRepository) GetClubByID(ctx context.Context, id uuid.UUID) (*domain.Club, error) {
	var club domain.Club
	if r.db == nil {
		return &club, nil
	}
	err := r.db.WithContext(ctx).First(&club, "id = ?", id).Error
	return &club, err
}

func (r *extracurricularRepository) AddMember(ctx context.Context, member *domain.ClubMember) error {
	if r.db == nil {
		return nil
	}
	member.JoinedAt = time.Now()
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *extracurricularRepository) RemoveMember(ctx context.Context, clubID, studentID uuid.UUID) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Where("club_id = ? AND student_id = ?", clubID, studentID).Delete(&domain.ClubMember{}).Error
}

func (r *extracurricularRepository) GetClubMembers(ctx context.Context, clubID uuid.UUID) ([]uuid.UUID, error) {
	var studentIDs []uuid.UUID
	if r.db == nil {
		return studentIDs, nil
	}
	err := r.db.WithContext(ctx).Model(&domain.ClubMember{}).Where("club_id = ?", clubID).Pluck("student_id", &studentIDs).Error
	return studentIDs, err
}

func (r *extracurricularRepository) GetStudentClubs(ctx context.Context, studentID uuid.UUID) ([]domain.Club, error) {
	var clubs []domain.Club
	if r.db == nil {
		return clubs, nil
	}
	err := r.db.WithContext(ctx).Joins("JOIN club_members ON club_members.club_id = clubs.id").
		Where("club_members.student_id = ?", studentID).Find(&clubs).Error
	return clubs, err
}

func (r *extracurricularRepository) CreateEvent(ctx context.Context, event *domain.Event) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *extracurricularRepository) GetEvents(ctx context.Context, start, end time.Time) ([]domain.Event, error) {
	var events []domain.Event
	if r.db == nil {
		return events, nil
	}
	err := r.db.WithContext(ctx).Where("start_time >= ? AND start_time <= ?", start, end).Find(&events).Error
	return events, err
}
