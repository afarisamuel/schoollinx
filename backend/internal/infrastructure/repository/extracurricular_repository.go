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
	if r.db == nil || studentID == uuid.Nil {
		return nil
	}
	matchingIDs := []uuid.UUID{studentID}
	var studentRecord domain.Student
	if err := r.db.WithContext(ctx).Where("user_id = ? OR id = ?", studentID, studentID).First(&studentRecord).Error; err == nil {
		if studentRecord.ID != uuid.Nil && studentRecord.ID != studentID {
			matchingIDs = append(matchingIDs, studentRecord.ID)
		}
		if studentRecord.UserID != nil && *studentRecord.UserID != uuid.Nil && *studentRecord.UserID != studentID {
			matchingIDs = append(matchingIDs, *studentRecord.UserID)
		}
	}
	return r.db.WithContext(ctx).Where("club_id = ? AND student_id IN ?", clubID, matchingIDs).Delete(&domain.ClubMember{}).Error
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
	clubs := make([]domain.Club, 0)
	if r.db == nil || studentID == uuid.Nil {
		return clubs, nil
	}

	matchingIDs := []uuid.UUID{studentID}
	var studentRecord domain.Student
	if err := r.db.WithContext(ctx).Where("user_id = ? OR id = ?", studentID, studentID).First(&studentRecord).Error; err == nil {
		if studentRecord.ID != uuid.Nil && studentRecord.ID != studentID {
			matchingIDs = append(matchingIDs, studentRecord.ID)
		}
		if studentRecord.UserID != nil && *studentRecord.UserID != uuid.Nil && *studentRecord.UserID != studentID {
			matchingIDs = append(matchingIDs, *studentRecord.UserID)
		}
	}

	var clubIDs []uuid.UUID
	err := r.db.WithContext(ctx).Model(&domain.ClubMember{}).
		Where("student_id IN ?", matchingIDs).
		Pluck("club_id", &clubIDs).Error
	if err != nil {
		return nil, err
	}

	if len(clubIDs) == 0 {
		return clubs, nil
	}

	err = r.db.WithContext(ctx).Where("id IN ?", clubIDs).Find(&clubs).Error
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
