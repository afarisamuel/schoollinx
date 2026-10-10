package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type messageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) domain.MessageRepository {
	return &messageRepository{db: db}
}

func (r *messageRepository) resolveToUserID(ctx context.Context, id uuid.UUID) uuid.UUID {
	if id == uuid.Nil {
		return id
	}
	var count int64
	if err := r.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", id).Count(&count).Error; err == nil && count > 0 {
		return id
	}
	// Check Teacher
	var teacher domain.Teacher
	if err := r.db.WithContext(ctx).First(&teacher, "id = ?", id).Error; err == nil && teacher.UserID != nil && *teacher.UserID != uuid.Nil {
		return *teacher.UserID
	}
	// Check Guardian
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).First(&guardian, "id = ?", id).Error; err == nil && guardian.UserID != uuid.Nil {
		return guardian.UserID
	}
	// Check Student
	var student domain.Student
	if err := r.db.WithContext(ctx).First(&student, "id = ?", id).Error; err == nil && student.UserID != nil && *student.UserID != uuid.Nil {
		return *student.UserID
	}
	return id
}

// FindOrCreateConversation retrieves an existing thread or starts a new one.
func (r *messageRepository) FindOrCreateConversation(ctx context.Context, a, b uuid.UUID) (*domain.Conversation, error) {
	a = r.resolveToUserID(ctx, a)
	b = r.resolveToUserID(ctx, b)

	// Check if either participant is a guardian
	var userA, userB domain.User
	_ = r.db.WithContext(ctx).First(&userA, "id = ?", a).Error
	_ = r.db.WithContext(ctx).First(&userB, "id = ?", b).Error

	if userA.Role == domain.RoleGuardian {
		if userB.Role == domain.RoleGuardian || userB.Role == domain.RoleStudent {
			return nil, fmt.Errorf("guardians are only permitted to message teachers and school administration")
		}
	}
	if userB.Role == domain.RoleGuardian {
		if userA.Role == domain.RoleGuardian || userA.Role == domain.RoleStudent {
			return nil, fmt.Errorf("guardians are only permitted to message teachers and school administration")
		}
	}

	var conv domain.Conversation
	err := r.db.WithContext(ctx).
		Where("(participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?)", a, b, b, a).
		First(&conv).Error

	if err == gorm.ErrRecordNotFound {
		conv = domain.Conversation{ParticipantA: a, ParticipantB: b}
		if createErr := r.db.WithContext(ctx).Create(&conv).Error; createErr != nil {
			return nil, createErr
		}
		return &conv, nil
	}
	return &conv, err
}

func (r *messageRepository) CreateGroupChannel(ctx context.Context, title, description, channelType string, isAnnouncement bool, creatorID uuid.UUID) (*domain.Conversation, error) {
	if channelType == "" {
		channelType = "GROUP"
	}
	conv := domain.Conversation{
		Type:           channelType,
		Title:          title,
		Description:    description,
		IsAnnouncement: isAnnouncement,
		ParticipantA:   creatorID,
		ParticipantB:   creatorID,
	}
	if err := r.db.WithContext(ctx).Create(&conv).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *messageRepository) GetConversationByID(ctx context.Context, conversationID uuid.UUID) (*domain.Conversation, error) {
	var conv domain.Conversation
	if err := r.db.WithContext(ctx).First(&conv, "id = ?", conversationID).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *messageRepository) GetConversationsByUser(ctx context.Context, userID uuid.UUID) ([]domain.ConversationDetail, error) {
	var convs []domain.Conversation
	err := r.db.WithContext(ctx).
		Where("participant_a = ? OR participant_b = ? OR type = 'GROUP' OR type = 'CLASS'", userID, userID).
		Order("updated_at DESC").
		Find(&convs).Error
	if err != nil {
		return nil, err
	}

	details := make([]domain.ConversationDetail, 0, len(convs))
	for _, conv := range convs {
		var contact *domain.ChatContact
		if conv.Type == "GROUP" || conv.Type == "CLASS" {
			contact = &domain.ChatContact{
				UserID:   conv.ID,
				Name:     conv.Title,
				Role:     domain.RoleTeacher,
				Subtitle: conv.Description,
			}
			if contact.Name == "" {
				contact.Name = "Campus Group"
			}
			if contact.Subtitle == "" {
				contact.Subtitle = "Official School Channel"
			}
		} else {
			otherID := conv.ParticipantA
			if otherID == userID {
				otherID = conv.ParticipantB
			}
			contact = r.resolveContactByID(ctx, otherID)
		}

		// Latest message
		var lastMsg domain.Message
		var lastMsgPtr *domain.Message
		if msgErr := r.db.WithContext(ctx).
			Where("conversation_id = ?", conv.ID).
			Order("created_at DESC").
			First(&lastMsg).Error; msgErr == nil {
			lastMsgPtr = &lastMsg
		}

		// Unread count
		var unreadCount int64
		_ = r.db.WithContext(ctx).Model(&domain.Message{}).
			Where("conversation_id = ? AND sender_id != ? AND is_read = false", conv.ID, userID).
			Count(&unreadCount).Error

		// Pinned count
		var pinnedCount int64
		_ = r.db.WithContext(ctx).Model(&domain.Message{}).
			Where("conversation_id = ? AND is_pinned = true", conv.ID).
			Count(&pinnedCount).Error

		details = append(details, domain.ConversationDetail{
			ID:               conv.ID,
			ParticipantA:     conv.ParticipantA,
			ParticipantB:     conv.ParticipantB,
			Type:             conv.Type,
			Title:            conv.Title,
			Description:      conv.Description,
			AvatarURL:        conv.AvatarURL,
			IsAnnouncement:   conv.IsAnnouncement,
			OtherParticipant: contact,
			LastMessage:      lastMsgPtr,
			UnreadCount:      unreadCount,
			PinnedCount:      pinnedCount,
			UpdatedAt:        conv.UpdatedAt,
			CreatedAt:        conv.CreatedAt,
		})
	}

	return details, nil
}

func (r *messageRepository) GetMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Preload("ReplyToMessage.Sender").
		Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Find(&messages).Error
	return messages, err
}

func (r *messageRepository) resolveUserName(ctx context.Context, id uuid.UUID) string {
	var teacher domain.Teacher
	if err := r.db.WithContext(ctx).Where("user_id = ? OR id = ?", id, id).First(&teacher).Error; err == nil {
		if name := strings.TrimSpace(string(teacher.FirstName) + " " + string(teacher.LastName)); name != "" {
			return name
		}
	}
	var guardian domain.Guardian
	if err := r.db.WithContext(ctx).Where("user_id = ? OR id = ?", id, id).First(&guardian).Error; err == nil {
		if name := strings.TrimSpace(string(guardian.FirstName) + " " + string(guardian.LastName)); name != "" {
			return name
		}
	}
	var student domain.Student
	if err := r.db.WithContext(ctx).Where("user_id = ? OR id = ?", id, id).First(&student).Error; err == nil {
		if name := strings.TrimSpace(string(student.FirstName) + " " + string(student.LastName)); name != "" {
			return name
		}
	}
	return "New Message"
}

func (r *messageRepository) SendMessage(ctx context.Context, msg *domain.Message) error {
	if err := r.db.WithContext(ctx).Create(msg).Error; err != nil {
		return err
	}
	_ = r.db.WithContext(ctx).Model(&domain.Conversation{}).
		Where("id = ?", msg.ConversationID).
		Update("updated_at", msg.CreatedAt).Error

	// Generate notification for recipient(s) in background so FCM push worker triggers
	go func() {
		var conv domain.Conversation
		if err := r.db.WithContext(ctx).First(&conv, "id = ?", msg.ConversationID).Error; err == nil {
			var recipients []uuid.UUID

			if conv.Type == "DIRECT" || (conv.ParticipantA != uuid.Nil && conv.ParticipantB != uuid.Nil) {
				if conv.ParticipantA == msg.SenderID {
					recipients = append(recipients, conv.ParticipantB)
				} else if conv.ParticipantB == msg.SenderID {
					recipients = append(recipients, conv.ParticipantA)
				}
			} else if conv.ClassID != nil && *conv.ClassID != uuid.Nil {
				var studentUserIDs []uuid.UUID
				_ = r.db.WithContext(ctx).Table("students").Where("class_id = ? AND user_id IS NOT NULL", *conv.ClassID).Pluck("user_id", &studentUserIDs).Error
				for _, uid := range studentUserIDs {
					if uid != msg.SenderID && uid != uuid.Nil {
						recipients = append(recipients, uid)
					}
				}
			}

			if len(recipients) > 0 {
				senderName := r.resolveUserName(ctx, msg.SenderID)

				preview := msg.Content
				if len(preview) > 100 {
					preview = preview[:100] + "..."
				}
				if preview == "" && msg.AttachmentName != "" {
					preview = fmt.Sprintf("Sent an attachment: %s", msg.AttachmentName)
				}

				for _, recipientID := range recipients {
					if recipientID != uuid.Nil {
						notif := domain.Notification{
							UserID:    recipientID,
							Title:     senderName,
							Message:   preview,
							Type:      domain.NotificationMessage,
							CreatedAt: time.Now(),
						}
						_ = r.db.WithContext(ctx).Create(&notif).Error
					}
				}
			}
		}
	}()

	return nil
}

func (r *messageRepository) MarkAsRead(ctx context.Context, conversationID, readerID uuid.UUID, readerName string, readerRole domain.Role) error {
	// Find unread messages
	var unreadMsgs []domain.Message
	if err := r.db.WithContext(ctx).
		Where("conversation_id = ? AND sender_id != ? AND is_read = false", conversationID, readerID).
		Find(&unreadMsgs).Error; err == nil {

		for _, msg := range unreadMsgs {
			var receipts []domain.ReadReceiptEntry
			if msg.ReadBy != "" {
				_ = json.Unmarshal([]byte(msg.ReadBy), &receipts)
			}
			alreadyPresent := false
			for _, rc := range receipts {
				if rc.UserID == readerID {
					alreadyPresent = true
					break
				}
			}
			if !alreadyPresent {
				receipts = append(receipts, domain.ReadReceiptEntry{
					UserID:   readerID,
					UserName: readerName,
					UserRole: readerRole,
					ReadAt:   msg.CreatedAt,
				})
				bytes, _ := json.Marshal(receipts)
				_ = r.db.WithContext(ctx).Model(&domain.Message{}).
					Where("id = ?", msg.ID).
					Updates(map[string]interface{}{
						"is_read": true,
						"read_by": string(bytes),
					}).Error
			}
		}
	}

	return r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = false", conversationID, readerID).
		Update("is_read", true).Error
}

func (r *messageRepository) TogglePinMessage(ctx context.Context, msgID, userID uuid.UUID) (bool, error) {
	var msg domain.Message
	if err := r.db.WithContext(ctx).First(&msg, "id = ?", msgID).Error; err != nil {
		return false, err
	}
	newPinned := !msg.IsPinned
	var pinnedBy *uuid.UUID
	if newPinned {
		pinnedBy = &userID
	}
	err := r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("id = ?", msgID).
		Updates(map[string]interface{}{
			"is_pinned": newPinned,
			"pinned_by": pinnedBy,
		}).Error
	return newPinned, err
}

func (r *messageRepository) GetReadReceipts(ctx context.Context, msgID uuid.UUID) ([]domain.ReadReceiptEntry, error) {
	var msg domain.Message
	if err := r.db.WithContext(ctx).First(&msg, "id = ?", msgID).Error; err != nil {
		return nil, err
	}
	var receipts []domain.ReadReceiptEntry
	if msg.ReadBy != "" {
		_ = json.Unmarshal([]byte(msg.ReadBy), &receipts)
	}
	return receipts, nil
}

func (r *messageRepository) VotePoll(ctx context.Context, msgID uuid.UUID, optionID string, userID uuid.UUID, userName string) error {
	var msg domain.Message
	if err := r.db.WithContext(ctx).First(&msg, "id = ?", msgID).Error; err != nil {
		return err
	}
	if msg.PollData == "" {
		return fmt.Errorf("message is not a poll")
	}

	var poll domain.PollData
	if err := json.Unmarshal([]byte(msg.PollData), &poll); err != nil {
		return err
	}

	userIdentifier := userName
	if userIdentifier == "" {
		userIdentifier = userID.String()
	}

	// Toggle vote: if already voted for this option, remove; otherwise add and ensure removed from other options (single choice)
	for i := range poll.Options {
		newVotes := make([]string, 0, len(poll.Options[i].Votes))
		for _, v := range poll.Options[i].Votes {
			if v != userIdentifier && v != userID.String() {
				newVotes = append(newVotes, v)
			}
		}
		if poll.Options[i].ID == optionID {
			// Check if already voted
			wasVoted := len(newVotes) < len(poll.Options[i].Votes)
			if !wasVoted {
				newVotes = append(newVotes, userIdentifier)
			}
		}
		poll.Options[i].Votes = newVotes
	}

	bytes, err := json.Marshal(poll)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("id = ?", msgID).
		Update("poll_data", string(bytes)).Error
}

func (r *messageRepository) GetChannelMembers(ctx context.Context, conversationID uuid.UUID) ([]domain.ChatContact, error) {
	var conv domain.Conversation
	if err := r.db.WithContext(ctx).First(&conv, "id = ?", conversationID).Error; err != nil {
		return nil, err
	}

	var users []domain.User
	if err := r.db.WithContext(ctx).Limit(100).Find(&users).Error; err != nil {
		return nil, err
	}

	contacts := make([]domain.ChatContact, 0, len(users))
	for _, u := range users {
		contacts = append(contacts, *r.buildContactFromUser(ctx, &u))
	}
	return contacts, nil
}

func (r *messageRepository) GetChannelMedia(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Where("conversation_id = ? AND attachment_url != ''", conversationID).
		Order("created_at DESC").
		Find(&messages).Error
	return messages, err
}

func (r *messageRepository) FlagMessage(ctx context.Context, msgID, flaggerID uuid.UUID, reason string) error {
	return r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("id = ?", msgID).
		Updates(map[string]interface{}{
			"is_flagged":  true,
			"flag_reason": reason,
			"flagged_by":  flaggerID,
		}).Error
}

func (r *messageRepository) AddReaction(ctx context.Context, msgID, userID uuid.UUID, userName, emoji string) error {
	var msg domain.Message
	if err := r.db.WithContext(ctx).First(&msg, "id = ?", msgID).Error; err != nil {
		return err
	}

	// Parse reactions map emoji -> []string
	reactionsMap := make(map[string][]string)
	if msg.Reactions != "" {
		_ = json.Unmarshal([]byte(msg.Reactions), &reactionsMap)
	}

	existingUsers := reactionsMap[emoji]
	found := false
	updatedUsers := make([]string, 0, len(existingUsers))
	identifier := userName
	if identifier == "" {
		identifier = userID.String()
	}

	for _, u := range existingUsers {
		if u == identifier || u == userID.String() {
			found = true // Toggle off
		} else {
			updatedUsers = append(updatedUsers, u)
		}
	}

	if !found {
		updatedUsers = append(updatedUsers, identifier)
	}

	if len(updatedUsers) > 0 {
		reactionsMap[emoji] = updatedUsers
	} else {
		delete(reactionsMap, emoji)
	}

	var bytes []byte
	if len(reactionsMap) > 0 {
		bytes, _ = json.Marshal(reactionsMap)
	}
	newReactionsStr := string(bytes)

	return r.db.WithContext(ctx).Model(&domain.Message{}).
		Where("id = ?", msgID).
		Update("reactions", newReactionsStr).Error
}

func (r *messageRepository) GetContacts(ctx context.Context, callerID uuid.UUID, callerRole domain.Role, query, roleFilter string) ([]domain.ChatContact, error) {
	var users []domain.User
	dbQuery := r.db.WithContext(ctx).Where("id != ?", callerID)

	// Guardians can ONLY view and message Teachers, Headmasters, and Administrative staff
	if callerRole == domain.RoleGuardian {
		allowedRoles := []domain.Role{
			domain.RoleTeacher,
			domain.RoleHeadmaster,
			domain.RoleAdmin,
			domain.RoleEcopowerAdmin,
			domain.RoleAccountant,
			domain.RoleBursar,
			domain.RoleLibrarian,
		}
		if roleFilter != "" && roleFilter != "ALL" {
			isAllowed := false
			for _, ar := range allowedRoles {
				if string(ar) == roleFilter {
					isAllowed = true
					break
				}
			}
			if isAllowed {
				dbQuery = dbQuery.Where("role = ?", roleFilter)
			} else {
				// Denied filter (e.g. STUDENT or GUARDIAN) -> return empty
				return []domain.ChatContact{}, nil
			}
		} else {
			dbQuery = dbQuery.Where("role IN ?", allowedRoles)
		}
	} else if roleFilter != "" && roleFilter != "ALL" {
		dbQuery = dbQuery.Where("role = ?", roleFilter)
	}

	trimmedQuery := strings.TrimSpace(query)
	if trimmedQuery != "" {
		likePattern := "%" + trimmedQuery + "%"
		dbQuery = dbQuery.Where("username ILIKE ? OR email ILIKE ?", likePattern, likePattern)
	}

	if err := dbQuery.Limit(60).Find(&users).Error; err != nil {
		return nil, err
	}

	contacts := make([]domain.ChatContact, 0, len(users))
	for _, u := range users {
		contact := r.buildContactFromUser(ctx, &u)
		if trimmedQuery == "" || strings.Contains(strings.ToLower(contact.Name), strings.ToLower(trimmedQuery)) || strings.Contains(strings.ToLower(contact.Subtitle), strings.ToLower(trimmedQuery)) || strings.Contains(strings.ToLower(contact.Email), strings.ToLower(trimmedQuery)) {
			contacts = append(contacts, *contact)
		}
	}

	return contacts, nil
}

func (r *messageRepository) resolveContactByID(ctx context.Context, userID uuid.UUID) *domain.ChatContact {
	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return &domain.ChatContact{
			UserID:   userID,
			Name:     "User",
			Role:     domain.RoleStudent,
			Subtitle: "Campus Member",
		}
	}
	return r.buildContactFromUser(ctx, &user)
}

func (r *messageRepository) buildContactFromUser(ctx context.Context, u *domain.User) *domain.ChatContact {
	var name string
	if u.Username != nil && string(*u.Username) != "" {
		name = string(*u.Username)
	} else {
		name = string(u.Email)
	}

	subtitle := string(u.Role)
	var avatarURL string

	switch u.Role {
	case domain.RoleTeacher, domain.RoleHeadmaster:
		var teacher domain.Teacher
		if err := r.db.WithContext(ctx).First(&teacher, "user_id = ?", u.ID).Error; err == nil {
			tName := strings.TrimSpace(string(teacher.FirstName) + " " + string(teacher.LastName))
			if tName != "" {
				name = tName
			}
			subtitle = "Faculty Member"
		}
	case domain.RoleGuardian:
		var guardian domain.Guardian
		if err := r.db.WithContext(ctx).Preload("Students").First(&guardian, "user_id = ?", u.ID).Error; err == nil {
			gName := strings.TrimSpace(string(guardian.FirstName) + " " + string(guardian.LastName))
			if gName != "" {
				name = gName
			}
			if len(guardian.Students) > 0 {
				firstStudent := guardian.Students[0]
				subtitle = fmt.Sprintf("Parent of %s %s", string(firstStudent.FirstName), string(firstStudent.LastName))
			} else {
				subtitle = "Parent / Guardian"
			}
		}
	case domain.RoleStudent:
		var student domain.Student
		if err := r.db.WithContext(ctx).First(&student, "user_id = ?", u.ID).Error; err == nil {
			sName := strings.TrimSpace(string(student.FirstName) + " " + string(student.LastName))
			if sName != "" {
				name = sName
			}
			subtitle = "Student"
			if student.PhotoURL != "" {
				avatarURL = student.PhotoURL
			}
		}
	case domain.RoleAdmin, domain.RoleEcopowerAdmin:
		subtitle = "School Administrator"
	case domain.RoleAccountant, domain.RoleBursar:
		subtitle = "Finance & Accounts"
	case domain.RoleLibrarian:
		subtitle = "Librarian"
	}

	return &domain.ChatContact{
		UserID:    u.ID,
		Name:      name,
		Email:     string(u.Email),
		Role:      u.Role,
		Subtitle:  subtitle,
		AvatarURL: avatarURL,
	}
}

func (r *messageRepository) GetScheduledMessages(ctx context.Context, conversationID uuid.UUID) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Where("conversation_id = ? AND scheduled_at > ?", conversationID, time.Now()).
		Order("scheduled_at asc").
		Find(&messages).Error
	return messages, err
}

func (r *messageRepository) CancelScheduledMessage(ctx context.Context, msgID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ?", msgID).
		Delete(&domain.Message{}).Error
}

func (r *messageRepository) DispatchScheduledMessages(ctx context.Context) ([]domain.Message, error) {
	var msgs []domain.Message
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("scheduled_at IS NOT NULL AND scheduled_at <= ?", now).
		Find(&msgs).Error
	if err != nil || len(msgs) == 0 {
		return nil, err
	}

	for i := range msgs {
		msgs[i].ScheduledAt = nil
		msgs[i].CreatedAt = now
		_ = r.db.WithContext(ctx).Model(&domain.Message{}).
			Where("id = ?", msgs[i].ID).
			Updates(map[string]interface{}{
				"scheduled_at": nil,
				"created_at":   now,
			}).Error
	}
	return msgs, nil
}

func (r *messageRepository) GetChannelAnalytics(ctx context.Context, conversationID uuid.UUID) (*domain.ChannelAnalytics, error) {
	var msgs []domain.Message
	if err := r.db.WithContext(ctx).Where("conversation_id = ?", conversationID).Find(&msgs).Error; err != nil {
		return nil, err
	}

	totalMsgs := len(msgs)
	if totalMsgs == 0 {
		return &domain.ChannelAnalytics{
			TotalMessages:          0,
			TotalParticipants:      0,
			ReadRatePercent:        100.0,
			TotalAttachments:       0,
			TotalPolls:             0,
			AverageResponseMinutes: 0,
			PeakHour:               "09:00 AM",
		}, nil
	}

	totalAttachments := 0
	totalPolls := 0
	readCount := 0
	participantMap := make(map[uuid.UUID]bool)
	hourCounts := make(map[int]int)

	for _, m := range msgs {
		participantMap[m.SenderID] = true
		if m.AttachmentURL != "" {
			totalAttachments++
		}
		if m.MessageType == "POLL" {
			totalPolls++
		}
		if m.IsRead {
			readCount++
		}
		hourCounts[m.CreatedAt.Hour()]++
	}

	peakHourNum := 9
	maxHourCount := 0
	for h, c := range hourCounts {
		if c > maxHourCount {
			maxHourCount = c
			peakHourNum = h
		}
	}
	peakHourStr := fmt.Sprintf("%02d:00", peakHourNum)

	readRate := float64(readCount) / float64(totalMsgs) * 100.0
	if readRate > 100.0 {
		readRate = 100.0
	}

	return &domain.ChannelAnalytics{
		TotalMessages:          totalMsgs,
		TotalParticipants:      len(participantMap),
		ReadRatePercent:        readRate,
		TotalAttachments:       totalAttachments,
		TotalPolls:             totalPolls,
		AverageResponseMinutes: 4.5,
		PeakHour:               peakHourStr,
	}, nil
}
