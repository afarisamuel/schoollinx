package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type communicationUseCase struct {
	repo      domain.CommunicationRepository
	sms       domain.SMSProvider
	guardians domain.GuardianRepository
	students  domain.StudentRepository
	teachers  domain.TeacherRepository
}

func NewCommunicationUseCase(repo domain.CommunicationRepository, sms domain.SMSProvider, guardians domain.GuardianRepository, students domain.StudentRepository, teachers domain.TeacherRepository) domain.CommunicationUseCase {
	return &communicationUseCase{repo: repo, sms: sms, guardians: guardians, students: students, teachers: teachers}
}

func (u *communicationUseCase) CreateNotice(ctx context.Context, notice *domain.Notice) error {
	return u.repo.CreateNotice(ctx, notice)
}

func (u *communicationUseCase) GetNotices(ctx context.Context, target string) ([]domain.Notice, error) {
	return u.repo.GetNotices(ctx, target)
}

func (u *communicationUseCase) ScheduleReminder(ctx context.Context, reminder *domain.Reminder) error {
	return u.repo.CreateReminder(ctx, reminder)
}

func (u *communicationUseCase) GetReminders(ctx context.Context) ([]domain.Reminder, error) {
	return u.repo.GetReminders(ctx)
}

func (u *communicationUseCase) SendUrgentSMS(ctx context.Context, targetAudience string, message string) error {
	var recipients []string

	if targetAudience == "ALL_PARENTS" {
		parents, err := u.guardians.GetAll(ctx)
		if err != nil {
			return err
		}
		for _, p := range parents {
			phone := string(p.PhoneNumber) // Decrypts from deterministic/encrypted string assuming it's available as string underlying type
			if phone != "" {
				recipients = append(recipients, phone)
			}
		}
	} else {
		// Fallback for demonstration
		recipients = []string{"0241234567"}
	}

	if len(recipients) == 0 {
		return nil // no one to send to
	}

	return u.sms.SendSMS(ctx, "BASIC-SMS", recipients, message)
}

func (u *communicationUseCase) CreateMeetingSlot(ctx context.Context, slot *domain.MeetingSlot) error {
	return u.repo.CreateMeetingSlot(ctx, slot)
}

func (u *communicationUseCase) GetMeetingSlotsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]domain.MeetingSlot, error) {
	return u.repo.GetMeetingSlotsByTeacher(ctx, teacherID)
}

func (u *communicationUseCase) BookMeeting(ctx context.Context, booking *domain.MeetingBooking) error {
	return u.repo.BookMeeting(ctx, booking)
}

func (u *communicationUseCase) GetBookingsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]domain.MeetingBooking, error) {
	return u.repo.GetBookingsByGuardian(ctx, guardianID)
}

func (u *communicationUseCase) ReceiveWhatsAppWebhook(ctx context.Context, payload map[string]interface{}) error {
	// Simple generic parser for a mock webhook payload or typical format
	// Extract sender phone, content
	// E.g. {"From": "whatsapp:+233241234567", "Body": "Hello!"}
	phone := ""
	content := ""
	messageID := ""

	if from, ok := payload["From"].(string); ok {
		phone = from
	}
	if body, ok := payload["Body"].(string); ok {
		content = body
	}
	if msgID, ok := payload["MessageSid"].(string); ok {
		messageID = msgID
	}

	msg := &domain.WhatsAppMessage{
		PhoneNumber: phone,
		Direction:   "INBOUND",
		Content:     content,
		Status:      "RECEIVED",
		MessageID:   messageID,
	}

	return u.repo.SaveWhatsAppMessage(ctx, msg)
}

func (u *communicationUseCase) SendWhatsAppMessage(ctx context.Context, phone string, content string) error {
	// Here we would typically call the external WhatsApp API (e.g. Twilio)
	// For now, we mock the sending and just save it as OUTBOUND

	msg := &domain.WhatsAppMessage{
		PhoneNumber: phone,
		Direction:   "OUTBOUND",
		Content:     content,
		Status:      "SENT", // Would be 'PENDING' then updated by callback
		MessageID:   uuid.New().String(), // Mock message ID
	}

	return u.repo.SaveWhatsAppMessage(ctx, msg)
}

func (u *communicationUseCase) GetWhatsAppMessages(ctx context.Context) ([]domain.WhatsAppMessage, error) {
	// For inbox, we might want to get recent messages or group by phone
	return u.repo.GetWhatsAppMessages(ctx, 100, 0)
}

func (u *communicationUseCase) SendBirthdayGreetings(ctx context.Context) (int, error) {
	today := time.Now()
	month := today.Month()
	day := today.Day()
	sentCount := 0

	// 1. Send to Students
	students, err := u.students.GetAll(ctx)
	if err == nil {
		for _, s := range students {
			dobStr := string(s.DOB)
			if dobStr == "" {
				continue
			}
			// Format is usually YYYY-MM-DD
			dob, parseErr := time.Parse("2006-01-02", dobStr)
			if parseErr != nil {
				// Try RFC3339 if needed
				dob, parseErr = time.Parse(time.RFC3339, dobStr)
			}
			if parseErr == nil && dob.Month() == month && dob.Day() == day {
				phone := string(s.PhoneNumber)
				if phone != "" {
					msg := "Happy Birthday, " + string(s.FirstName) + "! 🎂 Wishing you a fantastic day and a wonderful year ahead from all of us!"
					_ = u.sms.SendSMS(ctx, "SCHOOL", []string{phone}, msg)
					sentCount++
				}
			}
		}
	}

	// 2. Send to Teachers
	teachers, err := u.teachers.GetAll(ctx)
	if err == nil {
		for _, t := range teachers {
			dobStr := string(t.DOB)
			if dobStr == "" {
				continue
			}
			dob, parseErr := time.Parse("2006-01-02", dobStr)
			if parseErr != nil {
				dob, parseErr = time.Parse(time.RFC3339, dobStr)
			}
			if parseErr == nil && dob.Month() == month && dob.Day() == day {
				phone := string(t.PhoneNumber)
				if phone != "" {
					msg := "Happy Birthday, " + string(t.FirstName) + "! 🎂 Thank you for your dedication. Have a wonderful day!"
					_ = u.sms.SendSMS(ctx, "SCHOOL", []string{phone}, msg)
					sentCount++
				}
			}
		}
	}

	return sentCount, nil
}

// Emergency Broadcast (Feature 24)
func (u *communicationUseCase) DispatchEmergencyBroadcast(ctx context.Context, broadcast *domain.EmergencyBroadcast) error {
	if broadcast.CreatedAt.IsZero() {
		broadcast.CreatedAt = time.Now()
	}

	// 1. Gather recipients based on target audience
	var phones []string
	if broadcast.TargetAudience == "ALL" || broadcast.TargetAudience == "PARENTS" {
		parents, err := u.guardians.GetAll(ctx)
		if err == nil {
			for _, p := range parents {
				phone := string(p.PhoneNumber)
				if phone != "" {
					phones = append(phones, phone)
				}
			}
		}
	}
	if broadcast.TargetAudience == "ALL" || broadcast.TargetAudience == "TEACHERS" || broadcast.TargetAudience == "STAFF" {
		teachers, err := u.teachers.GetAll(ctx)
		if err == nil {
			for _, t := range teachers {
				phone := string(t.PhoneNumber)
				if phone != "" {
					phones = append(phones, phone)
				}
			}
		}
	}

	broadcast.RecipientsCount = len(phones)
	if err := u.repo.CreateEmergencyBroadcast(ctx, broadcast); err != nil {
		return err
	}

	// 2. Publish urgent in-app school notice
	_ = u.repo.CreateNotice(ctx, &domain.Notice{
		ID:        uuid.New(),
		Title:     fmt.Sprintf("[%s] %s", broadcast.Severity, broadcast.Title),
		Content:   broadcast.Message,
		Target:    broadcast.TargetAudience,
		IsActive:  true,
		CreatedAt: time.Now(),
	})

	// 3. Dispatch multi-channel SMS blast
	if len(phones) > 0 {
		smsMsg := fmt.Sprintf("[%s ALERT] %s: %s", broadcast.Severity, broadcast.Title, broadcast.Message)
		_ = u.sms.SendSMS(ctx, "EMERGENCY", phones, smsMsg)
	}

	return nil
}

func (u *communicationUseCase) GetEmergencyBroadcasts(ctx context.Context) ([]domain.EmergencyBroadcast, error) {
	return u.repo.GetEmergencyBroadcasts(ctx)
}
