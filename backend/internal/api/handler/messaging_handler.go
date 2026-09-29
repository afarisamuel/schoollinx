package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type MessagingHandler struct {
	useCase domain.MessageUseCase
}

func NewMessagingHandler(rg *gin.RouterGroup, useCase domain.MessageUseCase) {
	h := &MessagingHandler{useCase: useCase}

	msg := rg.Group("/messages")
	msg.GET("/conversations", h.ListConversations)
	msg.POST("/conversations", h.StartConversation)
	msg.POST("/channels", h.CreateGroupChannel)
	msg.GET("/conversations/:id", h.GetMessages)
	msg.POST("/conversations/:id/send", h.SendMessage)
	msg.POST("/conversations/:id/schedule", h.ScheduleMessage)
	msg.GET("/conversations/:id/scheduled", h.GetScheduledMessages)
	msg.DELETE("/scheduled/:id", h.CancelScheduledMessage)
	msg.PUT("/conversations/:id/read", h.MarkAsRead)
	msg.POST("/conversations/:id/pin", h.TogglePinMessage)
	msg.GET("/conversations/:id/export", h.ExportChat)
	msg.GET("/conversations/:id/members", h.GetChannelMembers)
	msg.GET("/conversations/:id/media", h.GetChannelMedia)
	msg.GET("/conversations/:id/analytics", h.GetChannelAnalytics)
	msg.POST("/conversations/:id/bot/attendance-summary", h.TriggerAttendanceDigest)
	msg.POST("/conversations/:id/bot/fee-reminder", h.TriggerFeeReminder)
	msg.POST("/conversations/:id/bot/exam-countdown", h.TriggerExamCountdown)
	msg.POST("/messages/:id/vote", h.VotePoll)
	msg.GET("/messages/:id/receipts", h.GetReadReceipts)
	msg.POST("/flag", h.FlagMessage)
	msg.POST("/react", h.AddReaction)
	msg.POST("/ai-assistant", h.AiCampusAssistant)
	msg.POST("/ai-summarize", h.AiSummarizeChannel)
	msg.POST("/ai-translate", h.AiTranslateMessage)
	msg.POST("/upload", h.UploadAttachment)
	msg.GET("/contacts", h.ListContacts)
}

// ListConversations returns all threads and channels the current user participates in
func (h *MessagingHandler) ListConversations(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)
	convs, err := h.useCase.GetConversationsByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, convs)
}

// ListContacts searches available campus members for messaging
func (h *MessagingHandler) ListContacts(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)
	roleVal, _ := c.Get("role")
	roleStr, _ := roleVal.(string)
	callerRole := domain.Role(roleStr)

	query := c.Query("query")
	roleFilter := c.Query("role")

	contacts, err := h.useCase.GetContacts(c.Request.Context(), userID, callerRole, query, roleFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, contacts)
}

// StartConversation finds or creates a direct-message thread between two users
func (h *MessagingHandler) StartConversation(c *gin.Context) {
	var body struct {
		RecipientID uuid.UUID `json:"recipient_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)
	conv, err := h.useCase.FindOrCreateConversation(c.Request.Context(), senderID, body.RecipientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conv)
}

// CreateGroupChannel creates a group or class announcement channel
func (h *MessagingHandler) CreateGroupChannel(c *gin.Context) {
	var body struct {
		Title          string `json:"title" binding:"required"`
		Description    string `json:"description"`
		Type           string `json:"type"` // GROUP or CLASS
		IsAnnouncement bool   `json:"is_announcement"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	creatorID := val.(uuid.UUID)
	conv, err := h.useCase.CreateGroupChannel(c.Request.Context(), body.Title, body.Description, body.Type, body.IsAnnouncement, creatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, conv)
}

// GetMessages returns the full chronological message history for a thread
func (h *MessagingHandler) GetMessages(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID format"})
		return
	}
	messages, err := h.useCase.GetMessages(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, messages)
}

// SendMessage persists a new chat message to a thread with optional attachments, moderation, and channel permissions
func (h *MessagingHandler) SendMessage(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID format"})
		return
	}
	var body struct {
		MessageType     string  `json:"message_type,omitempty"`
		Content         string  `json:"content"`
		ParentID        *string `json:"parent_id,omitempty"`
		AttachmentURL   string  `json:"attachment_url,omitempty"`
		AttachmentType  string  `json:"attachment_type,omitempty"`
		AttachmentName  string  `json:"attachment_name,omitempty"`
		AttachmentSize  int64   `json:"attachment_size,omitempty"`
		PollData        string  `json:"poll_data,omitempty"`
		ActionCardData  string  `json:"action_card_data,omitempty"`
		MeetingData     string  `json:"meeting_data,omitempty"`
		IsPinned        bool    `json:"is_pinned,omitempty"`
		IsUrgent        bool    `json:"is_urgent,omitempty"`
		FallbackSMS     bool    `json:"fallback_sms,omitempty"`
		AudioTranscript string  `json:"audio_transcript,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)

	roleVal, _ := c.Get("role")
	roleStr, _ := roleVal.(string)
	callerRole := domain.Role(roleStr)

	// Check channel broadcast permissions
	conv, convErr := h.useCase.GetConversationByID(c.Request.Context(), id)
	if convErr == nil && conv != nil && conv.IsAnnouncement {
		if callerRole == domain.RoleStudent || callerRole == domain.RoleGuardian {
			c.JSON(http.StatusForbidden, gin.H{"error": "This channel is in Announcement Mode. Only teachers and administrators can post."})
			return
		}
	}

	if body.Content == "" && body.AttachmentURL == "" && body.PollData == "" && body.MeetingData == "" && body.ActionCardData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message content, attachment, poll, or meeting data is required"})
		return
	}

	// Content Safeguarding & Bullying Moderation Filter
	isFlagged := false
	flagReason := ""
	lowerContent := strings.ToLower(body.Content)
	flaggedKeywords := []string{
		"idiot", "stupid", "hate you", "loser", "shut up", "cheat", "exam leak", "kill yourself", "threat", "bully",
	}
	for _, kw := range flaggedKeywords {
		if strings.Contains(lowerContent, kw) {
			isFlagged = true
			flagReason = fmt.Sprintf("Automated Safeguarding Trigger: Detected flagged term '%s'", kw)
			break
		}
	}

	msgType := body.MessageType
	if msgType == "" {
		msgType = "TEXT"
		if body.PollData != "" {
			msgType = "POLL"
		} else if body.MeetingData != "" {
			msgType = "MEETING"
		} else if body.ActionCardData != "" {
			msgType = "ACTION_CARD"
		}
	}

	msg := &domain.Message{
		ConversationID:  id,
		SenderID:        senderID,
		MessageType:     msgType,
		Content:         body.Content,
		AttachmentURL:   body.AttachmentURL,
		AttachmentType:  body.AttachmentType,
		AttachmentName:  body.AttachmentName,
		AttachmentSize:  body.AttachmentSize,
		PollData:        body.PollData,
		ActionCardData:  body.ActionCardData,
		MeetingData:     body.MeetingData,
		IsPinned:        body.IsPinned,
		IsUrgent:        body.IsUrgent,
		FallbackSMS:     body.FallbackSMS,
		AudioTranscript: body.AudioTranscript,
		IsFlagged:       isFlagged,
		FlagReason:      flagReason,
	}

	if body.ParentID != nil && *body.ParentID != "" {
		if pid, err := uuid.Parse(*body.ParentID); err == nil {
			msg.ParentID = &pid
		}
	}
	if err := h.useCase.SendMessage(c.Request.Context(), msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, msg)
}

// VotePoll records or toggles a user's vote on an in-chat poll
func (h *MessagingHandler) VotePoll(c *gin.Context) {
	msgID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID format"})
		return
	}
	var body struct {
		OptionID string `json:"option_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)

	nameVal, _ := c.Get("username")
	nameStr, _ := nameVal.(string)
	if nameStr == "" {
		nameStr = "User"
	}

	if err := h.useCase.VotePoll(c.Request.Context(), msgID, body.OptionID, userID, nameStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vote recorded"})
}

// GetChannelMembers returns all enrolled members in a group or class channel
func (h *MessagingHandler) GetChannelMembers(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	members, err := h.useCase.GetChannelMembers(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

// GetChannelMedia returns all files, PDFs, images, and voice notes shared in the conversation
func (h *MessagingHandler) GetChannelMedia(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	media, err := h.useCase.GetChannelMedia(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, media)
}

// TogglePinMessage pins or unpins a message in a conversation
func (h *MessagingHandler) TogglePinMessage(c *gin.Context) {
	var body struct {
		MessageID uuid.UUID `json:"message_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)

	isPinned, err := h.useCase.TogglePinMessage(c.Request.Context(), body.MessageID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_pinned": isPinned, "message": "Message pin state updated"})
}

// GetReadReceipts returns granular read receipt tracking for an announcement or message
func (h *MessagingHandler) GetReadReceipts(c *gin.Context) {
	msgID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}
	receipts, err := h.useCase.GetReadReceipts(c.Request.Context(), msgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, receipts)
}

// AddReaction toggles an emoji reaction on a message
func (h *MessagingHandler) AddReaction(c *gin.Context) {
	var body struct {
		MessageID uuid.UUID `json:"message_id" binding:"required"`
		Emoji     string    `json:"emoji" binding:"required"`
		UserName  string    `json:"user_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)

	if err := h.useCase.AddReaction(c.Request.Context(), body.MessageID, userID, body.UserName, body.Emoji); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Reaction updated"})
}

// MarkAsRead marks all incoming messages in a thread as read for the calling user
func (h *MessagingHandler) MarkAsRead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID format"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)
	roleVal, _ := c.Get("role")
	roleStr, _ := roleVal.(string)

	nameVal, _ := c.Get("username")
	nameStr, _ := nameVal.(string)
	if nameStr == "" {
		nameStr = "User"
	}

	if err := h.useCase.MarkAsRead(c.Request.Context(), id, userID, nameStr, domain.Role(roleStr)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "messages marked as read"})
}

// FlagMessage flags a message for administrative / safeguarding review
func (h *MessagingHandler) FlagMessage(c *gin.Context) {
	var body struct {
		MessageID uuid.UUID `json:"message_id" binding:"required"`
		Reason    string    `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	flaggerID := val.(uuid.UUID)
	if err := h.useCase.FlagMessage(c.Request.Context(), body.MessageID, flaggerID, body.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Message successfully reported for administrative review"})
}

// AiSummarizeChannel generates an executive summary of channel discussions & notices
func (h *MessagingHandler) AiSummarizeChannel(c *gin.Context) {
	var body struct {
		ConversationID uuid.UUID `json:"conversation_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	summary, err := h.useCase.SummarizeChannel(c.Request.Context(), body.ConversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// AiTranslateMessage translates message text into target language
func (h *MessagingHandler) AiTranslateMessage(c *gin.Context) {
	var body struct {
		Text       string `json:"text" binding:"required"`
		TargetLang string `json:"target_lang" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	translated, err := h.useCase.TranslateMessage(c.Request.Context(), body.Text, body.TargetLang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"translated_text": translated, "target_lang": body.TargetLang})
}

// ExportChat returns an audit transcript of the conversation
func (h *MessagingHandler) ExportChat(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	transcript, err := h.useCase.ExportChat(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"chat-transcript-%s.txt\"", id.String()[:8]))
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(transcript))
}

// UploadAttachment handles file/image/document uploads for chat messages
func (h *MessagingHandler) UploadAttachment(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	uploadDir := "./uploads/chat"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	uniqueID := uuid.New().String()
	fileName := fmt.Sprintf("%s_%s", uniqueID, filepath.Base(file.Filename))
	filePath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	host := c.Request.Host
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	fileURL := fmt.Sprintf("%s://%s/uploads/chat/%s", scheme, host, fileName)

	// Determine attachment category
	attachmentType := "file"
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg":
		attachmentType = "image"
	case ".pdf":
		attachmentType = "pdf"
	case ".mp3", ".wav", ".m4a", ".ogg", ".webm":
		attachmentType = "audio"
	}

	c.JSON(http.StatusOK, gin.H{
		"url":  fileURL,
		"name": file.Filename,
		"type": attachmentType,
		"size": file.Size,
	})
}

// AiCampusAssistant answers questions automatically for school staff, parents, and students
func (h *MessagingHandler) AiCampusAssistant(c *gin.Context) {
	var body struct {
		Query string `json:"query" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query is required"})
		return
	}

	q := strings.ToLower(body.Query)
	var answer string
	var suggestions []string

	if strings.Contains(q, "fee") || strings.Contains(q, "pay") || strings.Contains(q, "tuition") || strings.Contains(q, "bank") {
		answer = "💳 **Tuition & Payment Policy**:\n\nTuition fees can be paid seamlessly online via the **Parent Portal Payments** section (Mobile Money or Card), or deposited directly into the school's bank account:\n- **Bank**: GCB Bank\n- **Account Name**: SchoolLinx High School\n- **Account No**: 1081130004521\n\nPlease quote the Student Index Number on all transaction receipts."
		suggestions = []string{"How to view fee balance", "Deadline for Term 2 fees", "Contact Accounts Office"}
	} else if strings.Contains(q, "exam") || strings.Contains(q, "test") || strings.Contains(q, "timetable") || strings.Contains(q, "grade") {
		answer = "📝 **Examinations & Assessments**:\n\n- **Term 2 Mid-Terms**: Weeks 6 & 7.\n- **End of Term Examinations**: Scheduled to commence from **November 18th**.\n- Detailed subject-by-subject timetables are published on the Student & Parent Portals under the *Examinations* tab."
		suggestions = []string{"View Exam Rules", "Report Card Release Date", "Past Exam Questions"}
	} else if strings.Contains(q, "calendar") || strings.Contains(q, "holiday") || strings.Contains(q, "break") || strings.Contains(q, "term") {
		answer = "📅 **Academic Term Calendar**:\n\n- **Mid-Term Break**: Oct 14 – Oct 18\n- **PTA General Meeting**: Oct 26 (10:00 AM)\n- **Vacation Day**: Dec 12\n\nAll dates are subject to Ministry guidelines."
		suggestions = []string{"PTA Meeting Details", "Sports Day Date", "Speech & Prize Giving Day"}
	} else if strings.Contains(q, "uniform") || strings.Contains(q, "dress") || strings.Contains(q, "code") {
		answer = "👔 **School Uniform & Dress Code**:\n\n- **Mondays & Wednesdays**: Ceremonial School Uniform\n- **Tuesdays & Thursdays**: Regular Class Uniform\n- **Fridays**: Campus House/PE Wear\n\nAll items are available at the Campus Bookstore."
		suggestions = []string{"Bookstore Hours", "PE Kit Sizes", "Haircut & Grooming Guidelines"}
	} else {
		answer = fmt.Sprintf("👋 **SchoolLinx AI Assistant**:\n\nThank you for reaching out! Regarding *\"%s\"*, you can check the SchoolLinx Student/Parent Portal, or connect directly with our Administration Desk during office hours (Mon-Fri, 8:00 AM - 4:30 PM).", body.Query)
		suggestions = []string{"Tuition & Fees Info", "Exam Timetable", "Academic Calendar", "School Uniform Guidelines"}
	}

	c.JSON(http.StatusOK, gin.H{
		"query":       body.Query,
		"answer":      answer,
		"suggestions": suggestions,
	})
}

// ScheduleMessage saves a message to be auto-broadcast at a designated future time
func (h *MessagingHandler) ScheduleMessage(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)

	var body struct {
		Content        string    `json:"content" binding:"required"`
		ScheduledAt    time.Time `json:"scheduled_at" binding:"required"`
		MessageType    string    `json:"message_type"`
		AttachmentURL  string    `json:"attachment_url"`
		AttachmentType string    `json:"attachment_type"`
		AttachmentName string    `json:"attachment_name"`
		AttachmentSize int64     `json:"attachment_size"`
		PollData       string    `json:"poll_data"`
		ActionCardData string    `json:"action_card_data"`
		MeetingData    string    `json:"meeting_data"`
		IsUrgent       bool      `json:"is_urgent"`
		FallbackSMS    bool      `json:"fallback_sms"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msgType := body.MessageType
	if msgType == "" {
		msgType = "TEXT"
	}

	msg := &domain.Message{
		ConversationID: convID,
		SenderID:       senderID,
		MessageType:    msgType,
		Content:        body.Content,
		AttachmentURL:  body.AttachmentURL,
		AttachmentType: body.AttachmentType,
		AttachmentName: body.AttachmentName,
		AttachmentSize: body.AttachmentSize,
		PollData:       body.PollData,
		ActionCardData: body.ActionCardData,
		MeetingData:    body.MeetingData,
		IsUrgent:       body.IsUrgent,
		FallbackSMS:    body.FallbackSMS,
		CreatedAt:      time.Now(),
	}

	if err := h.useCase.ScheduleMessage(c.Request.Context(), msg, body.ScheduledAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, msg)
}

// GetScheduledMessages lists pending scheduled messages for a channel
func (h *MessagingHandler) GetScheduledMessages(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	msgs, err := h.useCase.GetScheduledMessages(c.Request.Context(), convID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, msgs)
}

// CancelScheduledMessage deletes a pending scheduled broadcast
func (h *MessagingHandler) CancelScheduledMessage(c *gin.Context) {
	msgID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(uuid.UUID)

	if err := h.useCase.CancelScheduledMessage(c.Request.Context(), msgID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// TriggerAttendanceDigest triggers the morning homeroom attendance digest card
func (h *MessagingHandler) TriggerAttendanceDigest(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)

	msg, err := h.useCase.TriggerAttendanceDigest(c.Request.Context(), convID, senderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, msg)
}

// TriggerFeeReminder triggers an automated fee reminder action card
func (h *MessagingHandler) TriggerFeeReminder(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)

	msg, err := h.useCase.TriggerFeeReminder(c.Request.Context(), convID, senderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, msg)
}

// TriggerExamCountdown triggers an automated exam countdown card
func (h *MessagingHandler) TriggerExamCountdown(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	senderID := val.(uuid.UUID)

	msg, err := h.useCase.TriggerExamCountdown(c.Request.Context(), convID, senderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, msg)
}

// GetChannelAnalytics returns communication statistics and engagement metrics
func (h *MessagingHandler) GetChannelAnalytics(c *gin.Context) {
	convID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}
	stats, err := h.useCase.GetChannelAnalytics(c.Request.Context(), convID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}


