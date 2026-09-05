package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type TimetableRepository struct {
	db *gorm.DB
}

func NewTimetableRepository(db *gorm.DB) *TimetableRepository {
	return &TimetableRepository{db: db}
}

func (r *TimetableRepository) Create(ctx context.Context, entry *domain.TimetableEntry) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *TimetableRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}
	return r.db.WithContext(ctx).Delete(&domain.TimetableEntry{}, "id = ?", id).Error
}

func (r *TimetableRepository) GetByClass(ctx context.Context, classID uuid.UUID) ([]domain.TimetableEntry, error) {
	var entries []domain.TimetableEntry
	if r.db == nil {
		return entries, nil
	}
	err := r.db.WithContext(ctx).Where("class_id = ?", classID).Find(&entries).Error
	return entries, err
}

func (r *TimetableRepository) GetByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.TimetableEntry, error) {
	var entries []domain.TimetableEntry
	if r.db == nil {
		return entries, nil
	}
	err := r.db.WithContext(ctx).Where("teacher_id = ?", teacherID).Find(&entries).Error
	return entries, err
}

func (r *TimetableRepository) GetByOverlap(ctx context.Context, dayOfWeek int, startTime, endTime string) ([]domain.TimetableEntry, error) {
	var entries []domain.TimetableEntry
	if r.db == nil {
		return entries, nil
	}
	// Logic: StartA < EndB AND EndA > StartB
	err := r.db.WithContext(ctx).Where("day_of_week = ? AND start_time < ? AND end_time > ?", dayOfWeek, endTime, startTime).Find(&entries).Error
	return entries, err
}

func (r *TimetableRepository) CreateExamSession(ctx context.Context, session *domain.ExamSession) error {
	return r.db.WithContext(ctx).Create(session).Error
}

func (r *TimetableRepository) DeleteExamSession(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.ExamSession{}, "id = ?", id).Error
}

func (r *TimetableRepository) CreateInvigilationDuty(ctx context.Context, duty *domain.InvigilationDuty) error {
	return r.db.WithContext(ctx).Create(duty).Error
}

func (r *TimetableRepository) GetExamSchedule(ctx context.Context, classID uuid.UUID) ([]domain.ExamSession, error) {
	var sessions []domain.ExamSession
	err := r.db.WithContext(ctx).Where("class_id = ?", classID).Order("date ASC, start_time ASC").Find(&sessions).Error
	return sessions, err
}

func (r *TimetableRepository) GetExamScheduleByPeriod(ctx context.Context, academicPeriodID uuid.UUID) ([]domain.ExamSession, error) {
	var sessions []domain.ExamSession
	err := r.db.WithContext(ctx).Where("academic_period_id = ?", academicPeriodID).Order("date ASC, start_time ASC").Find(&sessions).Error
	return sessions, err
}

func (r *TimetableRepository) AutoGenerateExamSchedule(ctx context.Context, academicPeriodID uuid.UUID) error {
	// 1. Fetch all classes
	var classes []domain.Class
	if err := r.db.WithContext(ctx).Find(&classes).Error; err != nil {
		return err
	}

	// 2. Fetch all subjects for fallback
	var allSubjects []domain.Subject
	_ = r.db.WithContext(ctx).Find(&allSubjects).Error

	// 3. Fetch all rooms/facilities
	var rooms []domain.Room
	_ = r.db.WithContext(ctx).Find(&rooms).Error

	var facilityID uuid.UUID
	if len(rooms) > 0 {
		facilityID = rooms[0].ID
	} else {
		// Create a fallback room if none exists so GORM doesn't fail foreign keys
		var count int64
		r.db.WithContext(ctx).Model(&domain.Room{}).Count(&count)
		if count == 0 {
			fallbackRoom := &domain.Room{
				ID:       uuid.New(),
				Name:     "Exam Hall Alpha",
				Capacity: 100,
				Type:     "HALL",
			}
			r.db.WithContext(ctx).Create(fallbackRoom)
			facilityID = fallbackRoom.ID
			rooms = append(rooms, *fallbackRoom)
		} else {
			var firstRoom domain.Room
			r.db.WithContext(ctx).First(&firstRoom)
			facilityID = firstRoom.ID
			rooms = append(rooms, firstRoom)
		}
	}

	// 4. Clear existing exam sessions for this period
	if err := r.db.WithContext(ctx).Where("academic_period_id = ?", academicPeriodID).Delete(&domain.ExamSession{}).Error; err != nil {
		return err
	}

	// 5. Exams start next Monday
	startDate := time.Now()
	for startDate.Weekday() != time.Monday {
		startDate = startDate.AddDate(0, 0, 1)
	}

	// 6. For each class, schedule exams
	for _, class := range classes {
		var subjectIDs []uuid.UUID

		var assignments []domain.AcademicAssignment
		if err := r.db.WithContext(ctx).Where("class_id = ?", class.ID).Find(&assignments).Error; err == nil && len(assignments) > 0 {
			for _, a := range assignments {
				subjectIDs = append(subjectIDs, a.SubjectID)
			}
		} else if len(allSubjects) > 0 {
			// Fallback to scheduling available curriculum subjects
			for _, s := range allSubjects {
				subjectIDs = append(subjectIDs, s.ID)
			}
		}

		examDate := startDate
		for i, subjID := range subjectIDs {
			startTime := "09:00"
			endTime := "12:00"
			if i%2 == 1 {
				startTime = "14:00"
				endTime = "17:00"
			}

			roomID := facilityID
			if len(rooms) > 0 {
				roomID = rooms[i%len(rooms)].ID
			}

			session := &domain.ExamSession{
				ID:               uuid.New(),
				ClassID:          class.ID,
				SubjectID:        subjID,
				FacilityID:       roomID,
				AcademicPeriodID: academicPeriodID,
				Date:             examDate,
				StartTime:        startTime,
				EndTime:          endTime,
			}
			r.db.WithContext(ctx).Create(session)

			// Next exam is on next day (skipping weekend)
			examDate = examDate.AddDate(0, 0, 1)
			if examDate.Weekday() == time.Saturday {
				examDate = examDate.AddDate(0, 0, 2)
			} else if examDate.Weekday() == time.Sunday {
				examDate = examDate.AddDate(0, 0, 1)
			}
		}
	}

	return nil
}

