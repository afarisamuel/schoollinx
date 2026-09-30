package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/push"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/pkg/utils"
	"gorm.io/gorm"
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

	// Notification Preferences Endpoints
	r.GET("/notifications/preferences", h.GetPreferences)
	r.PUT("/notifications/preferences", h.UpdatePreferences)

	// Web Push Notification Endpoints
	r.GET("/notifications/push/vapid-public-key", h.GetVAPIDPublicKey)
	r.POST("/notifications/push/subscribe", h.SubscribePush)
	r.POST("/notifications/push/unsubscribe", h.UnsubscribePush)
	r.GET("/notifications/push/subscriptions", h.GetUserSubscriptions)
	r.DELETE("/notifications/push/subscriptions/:id", h.DeleteSubscription)
	r.POST("/notifications/push/test", h.SendTestPush)
}

// ChatWebSocketHandler serves the dedicated /ws/chat WebSocket endpoint.
// It performs its own token validation and tenant resolution so the route
// can live outside the authenticated /api group (required for browser WS upgrades).
type ChatWebSocketHandler struct {
	hub        *ws.Hub
	msgUseCase domain.MessageUseCase
	cfg        *config.Config
	db         *gorm.DB
}

// NewChatWebSocketHandler registers GET /ws/chat on the given router group.
func NewChatWebSocketHandler(r *gin.RouterGroup, hub *ws.Hub, msgUseCase domain.MessageUseCase, cfg *config.Config, db *gorm.DB) {
	h := &ChatWebSocketHandler{hub: hub, msgUseCase: msgUseCase, cfg: cfg, db: db}
	r.GET("/chat", h.ServeChat)
}

func (h *ChatWebSocketHandler) ServeChat(c *gin.Context) {
	// 1. Validate JWT from ?token= query param (browsers cannot set headers during WS upgrade).
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	claims, err := utils.ValidateToken(tokenString, h.cfg)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	userID := claims.UserID

	// 2. Resolve tenant schema from ?tenant= subdomain query param.
	//    The frontend sends the subdomain exactly as done by notification.service.ts.
	tenantSchema := ""
	if tenantSubdomain := c.Query("tenant"); tenantSubdomain != "" && h.db != nil {
		var t domain.Tenant
		if err := h.db.Table("public.tenants").
			Where("subdomain = ? AND is_active = true", tenantSubdomain).
			First(&t).Error; err == nil {
			tenantSchema = t.SchemaName
		}
	}

	ws.ServeWs(h.hub, c.Writer, c.Request, userID, tenantSchema, h.msgUseCase)
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
		err := h.notifUC.SendPushNotification(
			c.Request.Context(),
			userID,
			"🔔 SchoolLinx Institutional Alert",
			"Push notifications are active and connected securely to your device. You will receive live alerts for attendance, fee payments, and chat messages.",
			"/favicon.ico",
			"/notifications",
		)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "test notification dispatched"})
}

func (h *NotificationHandler) GetPreferences(c *gin.Context) {
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

	if h.notifUC == nil {
		c.JSON(http.StatusOK, domain.NotificationPreference{UserID: userID})
		return
	}

	pref, err := h.notifUC.GetPreferences(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch preferences: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, pref)
}

func (h *NotificationHandler) UpdatePreferences(c *gin.Context) {
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

	var pref domain.NotificationPreference
	if err := c.ShouldBindJSON(&pref); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preferences payload: " + err.Error()})
		return
	}
	pref.UserID = userID

	if h.notifUC != nil {
		if err := h.notifUC.UpdatePreferences(c.Request.Context(), &pref); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save preferences: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, pref)
}

func (h *NotificationHandler) GetUserSubscriptions(c *gin.Context) {
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

	if h.notifUC == nil {
		c.JSON(http.StatusOK, []domain.PushSubscription{})
		return
	}

	subs, err := h.notifUC.GetUserSubscriptions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusOK, []domain.PushSubscription{})
		return
	}

	c.JSON(http.StatusOK, subs)
}

func (h *NotificationHandler) DeleteSubscription(c *gin.Context) {
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

	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription ID"})
		return
	}

	if h.notifUC != nil {
		_ = h.notifUC.DeleteSubscription(c.Request.Context(), subID, userID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "subscription removed"})
}
