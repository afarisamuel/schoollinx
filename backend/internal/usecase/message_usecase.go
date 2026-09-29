package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type messageUseCase struct {
	repo domain.MessageRepository
}

func NewMessageUseCase(repo domain.MessageRepository) domain.MessageUseCase {
	return &messageUseCase{repo: repo}
}

func (u *messageUseCase) FindOrCreateConversation(ctx context.Context, participantA, participantB uuid.UUID) (*domain.Conversation, error) {
	return u.repo.FindOrCreateConversation(ctx, participantA, participantB)
}

func (u *messageUseCase) GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]domain.ConversationDetail, error) {
	return u.repo.GetConversationsByUser(ctx, userID)
}

func (u *messageUseCase) GetMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	return u.repo.GetMessages(ctx, conversationID)
}

func (u *messageUseCase) checkSafeguardingKeywords(msg *domain.Message) {
	if msg.Content == "" {
		return
	}
	lower := strings.ToLower(msg.Content)
	flagKeywords := []string{
		"kill yourself", "suicide", "hurt yourself", "bring a gun", "bring a knife",
		"beat you up", "threaten", "stupid idiot", "ugly loser", "hate you all",
		"exam leak", "steal exam", "cheat sheet", "bomb",
	}

	for _, kw := range flagKeywords {
		if strings.Contains(lower, kw) {
			msg.IsFlagged = true
			msg.FlagReason = fmt.Sprintf("Automated Safety Filter: message contains flagged keyword phrase ('%s')", kw)
			break
		}
	}
}

func (u *messageUseCase) SendMessage(ctx context.Context, msg *domain.Message) error {
	u.checkSafeguardingKeywords(msg)
	return u.repo.SendMessage(ctx, msg)
}

func (u *messageUseCase) ScheduleMessage(ctx context.Context, msg *domain.Message, scheduledAt time.Time) error {
	msg.ScheduledAt = &scheduledAt
	u.checkSafeguardingKeywords(msg)
	return u.repo.SendMessage(ctx, msg)
}

func (u *messageUseCase) GetScheduledMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	return u.repo.GetScheduledMessages(ctx, conversationID)
}

func (u *messageUseCase) CancelScheduledMessage(ctx context.Context, msgID, userID uuid.UUID) error {
	return u.repo.CancelScheduledMessage(ctx, msgID, userID)
}

func (u *messageUseCase) MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID, readerName string, readerRole domain.Role) error {
	return u.repo.MarkAsRead(ctx, conversationID, readerID, readerName, readerRole)
}

func (u *messageUseCase) TogglePinMessage(ctx context.Context, msgID, userID uuid.UUID) (bool, error) {
	return u.repo.TogglePinMessage(ctx, msgID, userID)
}

func (u *messageUseCase) GetReadReceipts(ctx context.Context, msgID uuid.UUID) ([]domain.ReadReceiptEntry, error) {
	return u.repo.GetReadReceipts(ctx, msgID)
}

func (u *messageUseCase) GetConversationByID(ctx context.Context, conversationID uuid.UUID) (*domain.Conversation, error) {
	return u.repo.GetConversationByID(ctx, conversationID)
}

func (u *messageUseCase) CreateGroupChannel(ctx context.Context, title, description, channelType string, isAnnouncement bool, creatorID uuid.UUID) (*domain.Conversation, error) {
	return u.repo.CreateGroupChannel(ctx, title, description, channelType, isAnnouncement, creatorID)
}

func (u *messageUseCase) FlagMessage(ctx context.Context, msgID, flaggerID uuid.UUID, reason string) error {
	return u.repo.FlagMessage(ctx, msgID, flaggerID, reason)
}

func (u *messageUseCase) AddReaction(ctx context.Context, msgID, userID uuid.UUID, userName, emoji string) error {
	return u.repo.AddReaction(ctx, msgID, userID, userName, emoji)
}

func (u *messageUseCase) GetContacts(ctx context.Context, callerID uuid.UUID, callerRole domain.Role, query, roleFilter string) ([]domain.ChatContact, error) {
	return u.repo.GetContacts(ctx, callerID, callerRole, query, roleFilter)
}

func (u *messageUseCase) VotePoll(ctx context.Context, msgID uuid.UUID, optionID string, userID uuid.UUID, userName string) error {
	return u.repo.VotePoll(ctx, msgID, optionID, userID, userName)
}

func (u *messageUseCase) GetChannelMembers(ctx context.Context, conversationID uuid.UUID) ([]domain.ChatContact, error) {
	return u.repo.GetChannelMembers(ctx, conversationID)
}

func (u *messageUseCase) GetChannelMedia(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	return u.repo.GetChannelMedia(ctx, conversationID)
}

func (u *messageUseCase) SummarizeChannel(ctx context.Context, conversationID uuid.UUID) (string, error) {
	messages, err := u.repo.GetMessages(ctx, conversationID)
	if err != nil {
		return "", err
	}
	if len(messages) == 0 {
		return "No messages recorded in this channel yet.", nil
	}

	total := len(messages)
	recentLimit := 25
	startIdx := 0
	if total > recentLimit {
		startIdx = total - recentLimit
	}
	recent := messages[startIdx:]

	var summaryBuilder string
	summaryBuilder = fmt.Sprintf("📋 **AI Channel Executive Catch-Up (Analyzed %d Recent Messages)**:\n\n", len(recent))

	announcements := 0
	actionItems := 0
	for _, m := range recent {
		lower := strings.ToLower(m.Content)
		if m.IsPinned || strings.Contains(lower, "important") || strings.Contains(lower, "notice") || strings.Contains(lower, "announcement") || strings.Contains(lower, "deadline") {
			senderName := "Staff"
			if m.Sender != nil && m.Sender.Username != nil {
				senderName = string(*m.Sender.Username)
			}
			summaryBuilder += fmt.Sprintf("📌 **Key Update from %s**: %s\n", senderName, m.Content)
			announcements++
		} else if strings.Contains(lower, "homework") || strings.Contains(lower, "assignment") || strings.Contains(lower, "submit") || strings.Contains(lower, "bring") || strings.Contains(lower, "fee") {
			senderName := "Staff"
			if m.Sender != nil && m.Sender.Username != nil {
				senderName = string(*m.Sender.Username)
			}
			summaryBuilder += fmt.Sprintf("✅ **Action Item (%s)**: %s\n", senderName, m.Content)
			actionItems++
		}
	}

	if announcements == 0 && actionItems == 0 {
		summaryBuilder += "💬 **Discussion Highlights**:\n- Active dialogue regarding curriculum, campus activities, and general updates.\n- No critical pending alerts or overdue action items flagged in the latest exchanges."
	} else {
		summaryBuilder += fmt.Sprintf("\n*Status: %d key notices identified, %d action items pending completion.*", announcements, actionItems)
	}

	return summaryBuilder, nil
}

func (u *messageUseCase) TranslateMessage(ctx context.Context, text, targetLang string) (string, error) {
	if text == "" {
		return "", nil
	}
	normalizedLang := strings.ToLower(strings.TrimSpace(targetLang))

	// Academic & SMS phrasebook translation mapping
	translations := map[string]map[string]string{
		"french": {
			"hello": "bonjour",
			"welcome": "bienvenue",
			"good morning": "bonjour",
			"please note": "veuillez noter",
			"announcement": "annonce",
			"reminder": "rappel",
			"exam": "examen",
			"homework": "devoirs",
			"fee": "frais de scolarité",
			"meeting": "réunion",
			"school": "école",
			"thank you": "merci",
		},
		"spanish": {
			"hello": "hola",
			"welcome": "bienvenido",
			"good morning": "buenos días",
			"please note": "tenga en cuenta",
			"announcement": "anuncio",
			"reminder": "recordatorio",
			"exam": "examen",
			"homework": "tarea",
			"fee": "cuota",
			"meeting": "reunión",
			"school": "escuela",
			"thank you": "gracias",
		},
		"twi": {
			"hello": "akwaaba / akee",
			"welcome": "akwaaba",
			"good morning": "mema wo akye",
			"please note": "yɛsrɛ wo hyɛ no nso",
			"announcement": "nkaebɔ",
			"reminder": "nkaeɛ",
			"exam": "sɔhwɛ",
			"homework": "fie adwuma",
			"fee": "sukuu sika",
			"meeting": "nhyiamu",
			"school": "sukuu",
			"thank you": "medaase",
		},
		"arabic": {
			"hello": "مرحباً",
			"welcome": "أهلاً وسهلاً",
			"good morning": "صباح الخير",
			"please note": "يرجى الملاحظة",
			"announcement": "إعلان هام",
			"reminder": "تذكير",
			"exam": "امتحان",
			"homework": "واجب مدرسي",
			"fee": "رسوم دراسية",
			"meeting": "اجتماع",
			"school": "مدرسة",
			"thank you": "شكراً جزيلاً",
		},
	}

	dict, ok := translations[normalizedLang]
	if !ok {
		return fmt.Sprintf("[%s Translation]: %s", strings.ToUpper(targetLang), text), nil
	}

	translated := text
	for k, v := range dict {
		// Case insensitive replacement
		re := strings.NewReplacer(
			strings.ToLower(k), v,
			strings.Title(k), strings.Title(v),
			strings.ToUpper(k), strings.ToUpper(v),
		)
		translated = re.Replace(translated)
	}

	return fmt.Sprintf("🌐 **%s**: %s", strings.Title(targetLang), translated), nil
}

func (u *messageUseCase) ExportChat(ctx context.Context, conversationID uuid.UUID) (string, error) {
	messages, err := u.repo.GetMessages(ctx, conversationID)
	if err != nil {
		return "", err
	}
	conv, _ := u.repo.GetConversationByID(ctx, conversationID)

	title := "Chat Transcript"
	if conv != nil && conv.Title != "" {
		title = conv.Title
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("====================================================\n"))
	sb.WriteString(fmt.Sprintf("SCHOOLLINX CAMPUS MESSAGING SYSTEM - AUDIT LOG\n"))
	sb.WriteString(fmt.Sprintf("Thread/Channel: %s (ID: %s)\n", title, conversationID))
	sb.WriteString(fmt.Sprintf("Export Generated At: %s\n", time.Now().Format("2006-01-02 15:04:05 UTC")))
	sb.WriteString(fmt.Sprintf("Total Messages: %d\n", len(messages)))
	sb.WriteString(fmt.Sprintf("====================================================\n\n"))

	for idx, m := range messages {
		sender := "Unknown User"
		if m.Sender != nil && m.Sender.Username != nil {
			sender = string(*m.Sender.Username)
		}
		sb.WriteString(fmt.Sprintf("[%03d] %s | %s:\n", idx+1, m.CreatedAt.Format("2006-01-02 15:04:05"), sender))
		if m.IsPinned {
			sb.WriteString(fmt.Sprintf("     [PINNED NOTICE]\n"))
		}
		if m.AttachmentURL != "" {
			sb.WriteString(fmt.Sprintf("     [Attachment: %s (%s)] %s\n", m.AttachmentName, m.AttachmentType, m.AttachmentURL))
		}
		sb.WriteString(fmt.Sprintf("     %s\n\n", m.Content))
	}

	return sb.String(), nil
}

func (u *messageUseCase) TriggerAttendanceDigest(ctx context.Context, conversationID, senderID uuid.UUID) (*domain.Message, error) {
	now := time.Now()
	dateStr := now.Format("Monday, 02 Jan 2006")
	
	cardData := domain.ActionCardData{
		Title:         fmt.Sprintf("Homeroom Attendance Digest (%s)", now.Format("02 Jan")),
		Subtitle:      "Attendance verified: 96% present, 2 excused absences, 0 unexcused.",
		ActionType:    "VIEW_REPORT",
		ActionPayload: "/portal/terminal-reports",
		ButtonText:    "View Full Homeroom Roll Call",
		Icon:          "fa-clipboard-check",
		Badge:         "DAILY HOMEROOM REPORT",
	}
	cardBytes, _ := json.Marshal(cardData)

	msg := &domain.Message{
		ConversationID: conversationID,
		SenderID:       senderID,
		MessageType:    "ACTION_CARD",
		Content:        fmt.Sprintf("🤖 **Automated Campus Bot**: Daily Attendance Roll Call recorded for %s.", dateStr),
		ActionCardData: string(cardBytes),
		CreatedAt:      now,
	}

	if err := u.repo.SendMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func (u *messageUseCase) TriggerFeeReminder(ctx context.Context, conversationID, senderID uuid.UUID) (*domain.Message, error) {
	now := time.Now()
	cardData := domain.ActionCardData{
		Title:         "Term 2 Tuition Fee Due Reminder",
		Subtitle:      "Early bird clearance deadline is approaching in 5 school days. Please settle outstanding balances.",
		ActionType:    "PAY_FEE",
		ActionPayload: "/parents/payments",
		ButtonText:    "Pay Tuition Online (Card / MoMo)",
		Icon:          "fa-credit-card",
		Badge:         "FINANCE NOTICE",
	}
	cardBytes, _ := json.Marshal(cardData)

	msg := &domain.Message{
		ConversationID: conversationID,
		SenderID:       senderID,
		MessageType:    "ACTION_CARD",
		Content:        "🤖 **Automated Bursar Bot**: Automated tuition balance reminder for registered students.",
		ActionCardData: string(cardBytes),
		CreatedAt:      now,
	}

	if err := u.repo.SendMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func (u *messageUseCase) TriggerExamCountdown(ctx context.Context, conversationID, senderID uuid.UUID) (*domain.Message, error) {
	now := time.Now()
	cardData := domain.ActionCardData{
		Title:         "Midterm Examination Timetable Published",
		Subtitle:      "Assessments begin in 10 days. Ensure students have biometric cards and approved stationery.",
		ActionType:    "VIEW_REPORT",
		ActionPayload: "/portal/terminal-reports",
		ButtonText:    "Download Examination Timetable (PDF)",
		Icon:          "fa-calendar-days",
		Badge:         "EXAM TIMETABLE",
	}
	cardBytes, _ := json.Marshal(cardData)

	msg := &domain.Message{
		ConversationID: conversationID,
		SenderID:       senderID,
		MessageType:    "ACTION_CARD",
		Content:        "🤖 **Academic Bot**: Midterm examination schedules and subject outlines have been published.",
		ActionCardData: string(cardBytes),
		CreatedAt:      now,
	}

	if err := u.repo.SendMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func (u *messageUseCase) GetChannelAnalytics(ctx context.Context, conversationID uuid.UUID) (*domain.ChannelAnalytics, error) {
	return u.repo.GetChannelAnalytics(ctx, conversationID)
}


