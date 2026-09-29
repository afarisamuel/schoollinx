package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReadReceiptEntry details a user who has viewed an announcement or message
type ReadReceiptEntry struct {
	UserID   uuid.UUID `json:"user_id"`
	UserName string    `json:"user_name"`
	UserRole Role      `json:"user_role"`
	ReadAt   time.Time `json:"read_at"`
}

// PollOption represents a selectable option in an in-chat poll
type PollOption struct {
	ID    string   `json:"id"`
	Text  string   `json:"text"`
	Votes []string `json:"votes"` // list of user names or IDs
}

// PollData represents an interactive poll in a channel
type PollData struct {
	Question string       `json:"question"`
	Options  []PollOption `json:"options"`
	IsClosed bool         `json:"is_closed"`
}

// ActionCardData represents an interactive academic widget card (e.g. Fee invoice, Report Card)
type ActionCardData struct {
	Title         string `json:"title"`
	Subtitle      string `json:"subtitle"`
	ActionType    string `json:"action_type"` // 'PAY_FEE', 'VIEW_REPORT', 'VIEW_HOMEWORK'
	ActionPayload string `json:"action_payload"`
	ButtonText    string `json:"button_text"`
	Icon          string `json:"icon"`
	Badge         string `json:"badge"`
}

// MeetingData represents a virtual video conference link
type MeetingData struct {
	RoomName   string `json:"room_name"`
	MeetingURL string `json:"meeting_url"`
	Topic      string `json:"topic"`
	HostName   string `json:"host_name"`
}

// Message represents a single chat message in a thread or channel
type Message struct {
	TenantBase
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	ConversationID  uuid.UUID  `json:"conversation_id" gorm:"type:uuid;index;not null"`
	SenderID        uuid.UUID  `json:"sender_id" gorm:"type:uuid;not null"`
	ParentID        *uuid.UUID `json:"parent_id,omitempty" gorm:"type:uuid;index"` // For message threading
	MessageType     string     `json:"message_type" gorm:"type:varchar(50);default:'TEXT'"` // TEXT, POLL, ACTION_CARD, MEETING
	Content         string     `json:"content" gorm:"type:text;not null"`
	AttachmentURL   string     `json:"attachment_url,omitempty" gorm:"type:text"`
	AttachmentType  string     `json:"attachment_type,omitempty" gorm:"type:varchar(50)"` // "image", "pdf", "file", "audio"
	AttachmentName  string     `json:"attachment_name,omitempty" gorm:"type:varchar(255)"`
	AttachmentSize  int64      `json:"attachment_size,omitempty"`
	PollData        string     `json:"poll_data,omitempty" gorm:"type:text"`
	ActionCardData  string     `json:"action_card_data,omitempty" gorm:"type:text"`
	MeetingData     string     `json:"meeting_data,omitempty" gorm:"type:text"`
	IsPinned        bool       `json:"is_pinned" gorm:"default:false"`
	PinnedBy        *uuid.UUID `json:"pinned_by,omitempty" gorm:"type:uuid"`
	IsFlagged       bool       `json:"is_flagged" gorm:"default:false"`
	FlagReason      string     `json:"flag_reason,omitempty" gorm:"type:text"`
	FlaggedBy       *uuid.UUID `json:"flagged_by,omitempty" gorm:"type:uuid"`
	Reactions       string     `json:"reactions,omitempty" gorm:"type:text"` // JSON format map of emoji -> []string (user names)
	IsRead          bool       `json:"is_read" gorm:"default:false"`
	ReadBy          string     `json:"read_by,omitempty" gorm:"type:text"` // JSON list of ReadReceiptEntry
	AudioTranscript string     `json:"audio_transcript,omitempty" gorm:"type:text"`
	IsUrgent        bool       `json:"is_urgent" gorm:"default:false"`
	FallbackSMS     bool       `json:"fallback_sms" gorm:"default:false"`
	ScheduledAt     *time.Time `json:"scheduled_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`

	Sender         *User    `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
	ReplyToMessage *Message `json:"reply_to_message,omitempty" gorm:"foreignKey:ParentID"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}

// Conversation groups participants into a secure direct-message thread or group channel
type Conversation struct {
	TenantBase
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	ParticipantA   uuid.UUID  `json:"participant_a" gorm:"type:uuid;index"`
	ParticipantB   uuid.UUID  `json:"participant_b" gorm:"type:uuid;index"`
	Type           string     `json:"type" gorm:"type:varchar(50);default:'DIRECT'"` // DIRECT, GROUP, CLASS
	Title          string     `json:"title,omitempty" gorm:"type:varchar(255)"`
	Description    string     `json:"description,omitempty" gorm:"type:text"`
	AvatarURL      string     `json:"avatar_url,omitempty" gorm:"type:text"`
	IsAnnouncement bool       `json:"is_announcement" gorm:"default:false"`
	ClassID        *uuid.UUID `json:"class_id,omitempty" gorm:"type:uuid"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	Messages []Message `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
}

func (c *Conversation) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// ChatContact represents a discoverable user in the campus directory
type ChatContact struct {
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      Role      `json:"role"`
	Subtitle  string    `json:"subtitle"` // e.g., "Mathematics Teacher", "Parent of Alex Owusu", "Admin"
	AvatarURL string    `json:"avatar_url,omitempty"`
}

// ConversationDetail provides rich metadata about a thread or channel for the UI
type ConversationDetail struct {
	ID               uuid.UUID    `json:"id"`
	ParticipantA     uuid.UUID    `json:"participant_a"`
	ParticipantB     uuid.UUID    `json:"participant_b"`
	Type             string       `json:"type"` // DIRECT, GROUP, CLASS
	Title            string       `json:"title,omitempty"`
	Description      string       `json:"description,omitempty"`
	AvatarURL        string       `json:"avatar_url,omitempty"`
	IsAnnouncement   bool         `json:"is_announcement"`
	OtherParticipant *ChatContact `json:"other_participant"`
	LastMessage      *Message     `json:"last_message,omitempty"`
	UnreadCount      int64        `json:"unread_count"`
	PinnedCount      int64        `json:"pinned_count"`
	UpdatedAt        time.Time    `json:"updated_at"`
	CreatedAt        time.Time    `json:"created_at"`
}

// ChannelAnalytics aggregates communication activity and read statistics
type ChannelAnalytics struct {
	TotalMessages          int     `json:"total_messages"`
	TotalParticipants      int     `json:"total_participants"`
	ReadRatePercent        float64 `json:"read_rate_percent"`
	TotalAttachments       int     `json:"total_attachments"`
	TotalPolls             int     `json:"total_polls"`
	AverageResponseMinutes float64 `json:"average_response_minutes"`
	PeakHour               string  `json:"peak_hour"`
}

// MessageRepository abstracts persistence for in-app chat
type MessageRepository interface {
	FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*Conversation, error)
	CreateGroupChannel(ctx context.Context, title, description, channelType string, isAnnouncement bool, creatorID uuid.UUID) (*Conversation, error)
	GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]ConversationDetail, error)
	GetConversationByID(ctx context.Context, conversationID uuid.UUID) (*Conversation, error)
	GetMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	SendMessage(ctx context.Context, msg *Message) error
	MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID, readerName string, readerRole Role) error
	TogglePinMessage(ctx context.Context, msgID, userID uuid.UUID) (bool, error)
	GetReadReceipts(ctx context.Context, msgID uuid.UUID) ([]ReadReceiptEntry, error)
	VotePoll(ctx context.Context, msgID uuid.UUID, optionID string, userID uuid.UUID, userName string) error
	GetChannelMembers(ctx context.Context, conversationID uuid.UUID) ([]ChatContact, error)
	GetChannelMedia(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	FlagMessage(ctx context.Context, msgID, flaggerID uuid.UUID, reason string) error
	AddReaction(ctx context.Context, msgID, userID uuid.UUID, userName, emoji string) error
	GetContacts(ctx context.Context, callerID uuid.UUID, callerRole Role, query, roleFilter string) ([]ChatContact, error)
	GetScheduledMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	CancelScheduledMessage(ctx context.Context, msgID, userID uuid.UUID) error
	DispatchScheduledMessages(ctx context.Context) ([]Message, error)
	GetChannelAnalytics(ctx context.Context, conversationID uuid.UUID) (*ChannelAnalytics, error)
}

type MessageUseCase interface {
	FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*Conversation, error)
	CreateGroupChannel(ctx context.Context, title, description, channelType string, isAnnouncement bool, creatorID uuid.UUID) (*Conversation, error)
	GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]ConversationDetail, error)
	GetConversationByID(ctx context.Context, conversationID uuid.UUID) (*Conversation, error)
	GetMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	SendMessage(ctx context.Context, msg *Message) error
	ScheduleMessage(ctx context.Context, msg *Message, scheduledAt time.Time) error
	GetScheduledMessages(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	CancelScheduledMessage(ctx context.Context, msgID, userID uuid.UUID) error
	MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID, readerName string, readerRole Role) error
	TogglePinMessage(ctx context.Context, msgID, userID uuid.UUID) (bool, error)
	GetReadReceipts(ctx context.Context, msgID uuid.UUID) ([]ReadReceiptEntry, error)
	VotePoll(ctx context.Context, msgID uuid.UUID, optionID string, userID uuid.UUID, userName string) error
	GetChannelMembers(ctx context.Context, conversationID uuid.UUID) ([]ChatContact, error)
	GetChannelMedia(ctx context.Context, conversationID uuid.UUID) ([]Message, error)
	FlagMessage(ctx context.Context, msgID, flaggerID uuid.UUID, reason string) error
	AddReaction(ctx context.Context, msgID, userID uuid.UUID, userName, emoji string) error
	GetContacts(ctx context.Context, callerID uuid.UUID, callerRole Role, query, roleFilter string) ([]ChatContact, error)
	SummarizeChannel(ctx context.Context, conversationID uuid.UUID) (string, error)
	TranslateMessage(ctx context.Context, text, targetLang string) (string, error)
	ExportChat(ctx context.Context, conversationID uuid.UUID) (string, error)
	TriggerAttendanceDigest(ctx context.Context, conversationID, senderID uuid.UUID) (*Message, error)
	TriggerFeeReminder(ctx context.Context, conversationID, senderID uuid.UUID) (*Message, error)
	TriggerExamCountdown(ctx context.Context, conversationID, senderID uuid.UUID) (*Message, error)
	GetChannelAnalytics(ctx context.Context, conversationID uuid.UUID) (*ChannelAnalytics, error)
}

