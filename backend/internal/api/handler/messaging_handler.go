package handler

import (
	"net/http"

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
	msg.GET("/conversations/:id", h.GetMessages)
	msg.POST("/conversations/:id/send", h.SendMessage)
	msg.PUT("/conversations/:id/read", h.MarkAsRead)
}

// ListConversations returns all threads the current user participates in
func (h *MessagingHandler) ListConversations(c *gin.Context) {
	val, _ := c.Get("userID")
	userID := val.(uuid.UUID)
	convs, err := h.useCase.GetConversationsByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, convs)
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
	val, _ := c.Get("userID")
	senderID := val.(uuid.UUID)
	conv, err := h.useCase.FindOrCreateConversation(c.Request.Context(), senderID, body.RecipientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conv)
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

// SendMessage persists a new chat message to a thread
func (h *MessagingHandler) SendMessage(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID format"})
		return
	}
	var body struct {
		Content  string  `json:"content" binding:"required"`
		ParentID *string `json:"parent_id,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	val, _ := c.Get("userID")
	senderID := val.(uuid.UUID)
	
	msg := &domain.Message{
		ConversationID: id,
		SenderID:       senderID,
		Content:        body.Content,
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

// MarkAsRead marks all incoming messages in a thread as read for the calling user
func (h *MessagingHandler) MarkAsRead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID format"})
		return
	}
	val, _ := c.Get("userID")
	userID := val.(uuid.UUID)
	if err := h.useCase.MarkAsRead(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "messages marked as read"})
}
