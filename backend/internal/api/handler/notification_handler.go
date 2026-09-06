package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/push"
)

type NotificationHandler struct {
	hub        *ws.Hub
	msgUseCase domain.MessageUseCase
	notifUC    domain.NotificationUseCase
	webPush    push.WebPushService
}

func NewNotificationHandler(r *gin.RouterGroup, hub *ws.Hub, msgUseCase domain.MessageUseCase, notifUC domain.NotificationUseCase, webPush ...push.WebPushService) {
	h := &NotificationHandler{hub: hub, msgUseCase: msgUseCase, notifUC: notifUC}
	if len(webPush) > 0 {
		h.webPush = webPush[0]
	}
	r.GET("/ws", h.WebSocket)
	r.GET("/notifications", h.GetNotifications)
	r.PUT("/notifications/:id/read", h.MarkAsRead)
	r.PUT("/notifications/read-all", h.MarkAllAsRead)

	// Web Push Notification Endpoints
	r.GET("/notifications/push/vapid-public-key", h.GetVAPIDPublicKey)
	r.POST("/notifications/push/subscribe", h.SubscribePush)
	r.POST("/notifications/push/unsubscribe", h.UnsubscribePush)
	r.POST("/notifications/push/test", h.SendTestPush)
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

func (h *NotificationHandler) GetVAPIDPublicKey(c *gin.Context) {
	if h.webPush == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Web Push service not configured"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"publicKey": h.webPush.GetVAPIDPublicKey(),
	})
}

type PushSubscribeRequest struct {
	Endpoint  string `json:"endpoint" binding:"required"`
	Keys      struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
	UserAgent string `json:"user_agent"`
}

func (h *NotificationHandler) SubscribePush(c *gin.Context) {
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

	var req PushSubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription data: " + err.Error()})
		return
	}

	sub := &domain.PushSubscription{
		UserID:    userID,
		Endpoint:  req.Endpoint,
		P256dh:    req.Keys.P256dh,
		Auth:      req.Keys.Auth,
		UserAgent: req.UserAgent,
	}

	if h.notifUC != nil {
		if err := h.notifUC.SubscribePush(c.Request.Context(), sub); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save subscription: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "subscribed", "id": sub.ID})
}

type PushUnsubscribeRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

func (h *NotificationHandler) UnsubscribePush(c *gin.Context) {
	var req PushUnsubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Endpoint is required"})
		return
	}

	if h.notifUC != nil {
		_ = h.notifUC.UnsubscribePush(c.Request.Context(), req.Endpoint)
	}

	c.JSON(http.StatusOK, gin.H{"status": "unsubscribed"})
}

func (h *NotificationHandler) SendTestPush(c *gin.Context) {
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
		_ = h.notifUC.SendPushNotification(
			c.Request.Context(),
			userID,
			"🔔 SchoolLinx Push Notifications",
			"Push notification channel is active and connected securely to your device.",
			"/favicon.ico",
			"/notifications",
		)
	}

	c.JSON(http.StatusOK, gin.H{"status": "test notification dispatched"})
}
