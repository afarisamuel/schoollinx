package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notice struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title     string    `json:"title" gorm:"not null"`
	Content   string    `json:"content" gorm:"not null"`
	AuthorID  uuid.UUID `json:"author_id" gorm:"type:uuid;not null"`
	Target    string    `json:"target"` // "ALL", "PARENTS", "TEACHERS", "STUDENTS"
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (n *Notice) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

type Reminder struct {
	TenantBase
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title        string    `json:"title" gorm:"not null"`
	Message      string    `json:"message" gorm:"not null"`
	TargetAudience string  `json:"target_audience"` // e.g., "FEE_DEFAULTERS", "ALL_PARENTS"
	SendDate     time.Time `json:"send_date" gorm:"not null"`
	Status       string    `json:"status" gorm:"default:'PENDING'"` // PENDING, SENT, FAILED
	Channel      string    `json:"channel" gorm:"default:'SMS'"`    // SMS, EMAIL, PUSH
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (r *Reminder) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type MeetingSlot struct {
	TenantBase
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TeacherID uuid.UUID `json:"teacher_id" gorm:"type:uuid;not null"`
	Date      time.Time `json:"date" gorm:"not null"`
	StartTime string    `json:"start_time" gorm:"not null"` // e.g. "14:00"
	EndTime   string    `json:"end_time" gorm:"not null"`   // e.g. "14:30"
	IsBooked  bool      `json:"is_booked" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *MeetingSlot) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type MeetingBooking struct {
	TenantBase
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	MeetingSlotID uuid.UUID `json:"meeting_slot_id" gorm:"type:uuid;not null"`
	GuardianID    uuid.UUID `json:"guardian_id" gorm:"type:uuid;not null"`
	StudentID     uuid.UUID `json:"student_id" gorm:"type:uuid"`
	Reason        string    `json:"reason"`
	Status        string    `json:"status" gorm:"default:'CONFIRMED'"` // CONFIRMED, CANCELLED
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	Slot MeetingSlot `json:"slot" gorm:"foreignKey:MeetingSlotID"`
}

func (b *MeetingBooking) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// SMSProvider interface defines the contract for sending SMS
type SMSProvider interface {
	SendSMS(ctx context.Context, senderID string, recipients []string, message string) error
}

type CommunicationRepository interface {
	CreateNotice(ctx context.Context, notice *Notice) error
	GetNotices(ctx context.Context, target string) ([]Notice, error)
	DeleteNotice(ctx context.Context, id uuid.UUID) error

	CreateReminder(ctx context.Context, reminder *Reminder) error
	GetPendingReminders(ctx context.Context, until time.Time) ([]Reminder, error)
	UpdateReminderStatus(ctx context.Context, id uuid.UUID, status string) error
	GetReminders(ctx context.Context) ([]Reminder, error)

	CreateMeetingSlot(ctx context.Context, slot *MeetingSlot) error
	GetMeetingSlotsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]MeetingSlot, error)
	BookMeeting(ctx context.Context, booking *MeetingBooking) error
	GetBookingsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]MeetingBooking, error)

	SaveWhatsAppMessage(ctx context.Context, msg *WhatsAppMessage) error
	GetWhatsAppMessages(ctx context.Context, limit int, offset int) ([]WhatsAppMessage, error)
	GetWhatsAppMessagesByPhone(ctx context.Context, phone string) ([]WhatsAppMessage, error)
}

type CommunicationUseCase interface {
	CreateNotice(ctx context.Context, notice *Notice) error
	GetNotices(ctx context.Context, target string) ([]Notice, error)
	
	ScheduleReminder(ctx context.Context, reminder *Reminder) error
	GetReminders(ctx context.Context) ([]Reminder, error)
	
	SendUrgentSMS(ctx context.Context, targetAudience string, message string) error

	CreateMeetingSlot(ctx context.Context, slot *MeetingSlot) error
	GetMeetingSlotsByTeacher(ctx context.Context, teacherID uuid.UUID) ([]MeetingSlot, error)
	BookMeeting(ctx context.Context, booking *MeetingBooking) error
	GetBookingsByGuardian(ctx context.Context, guardianID uuid.UUID) ([]MeetingBooking, error)

	ReceiveWhatsAppWebhook(ctx context.Context, payload map[string]interface{}) error
	SendWhatsAppMessage(ctx context.Context, phone string, content string) error
	GetWhatsAppMessages(ctx context.Context) ([]WhatsAppMessage, error)

	SendBirthdayGreetings(ctx context.Context) (int, error)
}

type WhatsAppMessage struct {
	TenantBase
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	PhoneNumber string    `json:"phone_number" gorm:"not null;index"`
	Direction   string    `json:"direction" gorm:"not null"` // "INBOUND" or "OUTBOUND"
	Content     string    `json:"content" gorm:"not null"`
	Status      string    `json:"status" gorm:"default:'RECEIVED'"` // RECEIVED, SENT, DELIVERED, READ
	MessageID   string    `json:"message_id"`                       // External provider ID
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (w *WhatsAppMessage) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

