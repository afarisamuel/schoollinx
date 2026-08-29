package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type communicationRepository struct {
	db *gorm.DB
}

func NewCommunicationRepository(db *gorm.DB) domain.CommunicationRepository {
	return &communicationRepository{db: db}
}

func (r *communicationRepository) CreateNotice(ctx context.Context, notice *domain.Notice) error {
	return r.db.WithContext(ctx).Create(notice).Error
}

func (r *communicationRepository) GetNotices(ctx context.Context, target string) ([]domain.Notice, error) {
	var notices []domain.Notice
	query := r.db.WithContext(ctx).Where("is_active = ?", true)
	if target != "" && target != "ALL" {
		query = query.Where("target IN ?", []string{"ALL", target})
	}
	err := query.Order("created_at DESC").Find(&notices).Error
	return notices, err
}

func (r *communicationRepository) DeleteNotice(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Notice{}, "id = ?", id).Error
}

func (r *communicationRepository) CreateReminder(ctx context.Context, reminder *domain.Reminder) error {
	return r.db.WithContext(ctx).Create(reminder).Error
}

func (r *communicationRepository) GetPendingReminders(ctx context.Context, until time.Time) ([]domain.Reminder, error) {
	var reminders []domain.Reminder
	err := r.db.WithContext(ctx).Where("status = ? AND send_date <= ?", "PENDING", until).Find(&reminders).Error
	return reminders, err
}

func (r *communicationRepository) UpdateReminderStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).Model(&domain.Reminder{}).Where("id = ?", id).Update("status", status).Error
}

func (r *communicationRepository) GetReminders(ctx context.Context) ([]domain.Reminder, error) {
	var reminders []domain.Reminder
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&reminders).Error
	return reminders, err
}

func (r *communicationRepository) CreateMeetingSlot(ctx context.Context, slot *domain.MeetingSlot) error {
	return r.db.WithContext(ctx).Create(slot).Error
}

func (r *communicationRepository) GetMeetingSlotsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.MeetingSlot, error) {
	var slots []domain.MeetingSlot
	err := r.db.WithContext(ctx).Where("teacher_id = ? AND date >= ?", teacherID, time.Now().Truncate(24*time.Hour)).Order("date ASC, start_time ASC").Find(&slots).Error
	return slots, err
}

func (r *communicationRepository) BookMeeting(ctx context.Context, booking *domain.MeetingBooking) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(booking).Error; err != nil {
			return err
		}
		return tx.Model(&domain.MeetingSlot{}).Where("id = ?", booking.MeetingSlotID).Update("is_booked", true).Error
	})
}

func (r *communicationRepository) GetBookingsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]domain.MeetingBooking, error) {
	var bookings []domain.MeetingBooking
	err := r.db.WithContext(ctx).Where("guardian_id = ?", guardianID).Preload("Slot").Order("created_at DESC").Find(&bookings).Error
	return bookings, err
}

func (r *communicationRepository) SaveWhatsAppMessage(ctx context.Context, msg *domain.WhatsAppMessage) error {
	return r.db.WithContext(ctx).Save(msg).Error
}

func (r *communicationRepository) GetWhatsAppMessages(ctx context.Context, limit int, offset int) ([]domain.WhatsAppMessage, error) {
	var messages []domain.WhatsAppMessage
	err := r.db.WithContext(ctx).Order("created_at DESC").Limit(limit).Offset(offset).Find(&messages).Error
	return messages, err
}

func (r *communicationRepository) GetWhatsAppMessagesByPhone(ctx context.Context, phone string) ([]domain.WhatsAppMessage, error) {
	var messages []domain.WhatsAppMessage
	err := r.db.WithContext(ctx).Where("phone_number = ?", phone).Order("created_at ASC").Find(&messages).Error
	return messages, err
}

// Emergency Broadcast (Feature 24)
func (r *communicationRepository) CreateEmergencyBroadcast(ctx context.Context, broadcast *domain.EmergencyBroadcast) error {
	if broadcast.ID == uuid.Nil {
		broadcast.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(broadcast).Error
}

func (r *communicationRepository) GetEmergencyBroadcasts(ctx context.Context) ([]domain.EmergencyBroadcast, error) {
	var broadcasts []domain.EmergencyBroadcast
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&broadcasts).Error
	return broadcasts, err
}
