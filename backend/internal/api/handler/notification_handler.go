package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
)

type NotificationHandler struct {
	hub        *ws.Hub
	msgUseCase domain.MessageUseCase
	notifUC    domain.NotificationUseCase
}

func NewNotificationHandler(r *gin.RouterGroup, hub *ws.Hub, msgUseCase domain.MessageUseCase, notifUC ...domain.NotificationUseCase) {
	h := &NotificationHandler{hub: hub, msgUseCase: msgUseCase}
	if len(notifUC) > 0 {
		h.notifUC = notifUC[0]
	}
	r.GET("/ws", h.WebSocket)
	r.GET("/notifications", h.GetNotifications)
	r.PUT("/notifications/:id/read", h.MarkAsRead)
	r.PUT("/notifications/read-all", h.MarkAllAsRead)
}

func (h *NotificationHandler) WebSocket(c *gin.Context) {
	// Extract user ID from context (set by AuthMiddleware)
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID, ok := val.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	// Extract tenant schema from context (set by TenantMiddleware via c.Set)
	tenantSchema := ""
	if schema, exists := c.Get("tenantSchema"); exists {
		tenantSchema = schema.(string)
	}

	ws.ServeWs(h.hub, c.Writer, c.Request, userID, tenantSchema, h.msgUseCase)
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if h.notifUC == nil {
		c.JSON(http.StatusOK, []domain.Notification{})
		return
	}

	notifs, err := h.notifUC.GetNotificationsForUser(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusOK, []domain.Notification{})
		return
	}
	c.JSON(http.StatusOK, notifs)
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	if h.notifUC != nil {
		_ = h.notifUC.MarkAsRead(c.Request.Context(), id, userID)
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	if h.notifUC != nil {
		_ = h.notifUC.MarkAllAsRead(c.Request.Context(), userID)
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
