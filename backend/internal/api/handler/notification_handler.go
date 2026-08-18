package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/ws"
	"github.com/user/high-school-management/backend/internal/domain"
)

type NotificationHandler struct {
	hub        *ws.Hub
	msgUseCase domain.MessageUseCase
}

func NewNotificationHandler(r *gin.RouterGroup, hub *ws.Hub, msgUseCase domain.MessageUseCase) {
	h := &NotificationHandler{hub: hub, msgUseCase: msgUseCase}
	r.GET("/ws", h.WebSocket)
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
