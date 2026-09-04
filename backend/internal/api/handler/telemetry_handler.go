package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type TelemetryHandler struct {
	useCase usecase.TelemetryUseCase
}

func NewTelemetryHandler(r *gin.RouterGroup, useCase usecase.TelemetryUseCase) {
	h := &TelemetryHandler{useCase: useCase}

	// Public / Front-end endpoints
	r.POST("/events", h.LogEvent)

	// Super Admin endpoints (should be wired under a protected group)
	admin := r.Group("/admin")
	admin.GET("/active-users", h.GetActiveUsers)
	admin.GET("/module-usage", h.GetModuleUsage)
	admin.GET("/funnel", h.GetFunnelMetrics)
	admin.GET("/errors", h.GetErrors)
	admin.GET("/db-pool", h.GetDatabaseStats)
}

func (h *TelemetryHandler) LogEvent(c *gin.Context) {
	var req struct {
		TenantID  *uuid.UUID                 `json:"tenant_id"`
		UserID    *uuid.UUID                 `json:"user_id"`
		EventType domain.TelemetryEventType  `json:"event_type" binding:"required"`
		Metadata  map[string]interface{}     `json:"metadata"`
		Device    string                     `json:"device"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ip := c.ClientIP()

	if err := h.useCase.LogEvent(c.Request.Context(), req.TenantID, req.UserID, req.EventType, req.Metadata, ip, req.Device); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "logged"})
}

func (h *TelemetryHandler) GetActiveUsers(c *gin.Context) {
	data, err := h.useCase.GetActiveUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *TelemetryHandler) GetModuleUsage(c *gin.Context) {
	data, err := h.useCase.GetModuleUsage(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *TelemetryHandler) GetFunnelMetrics(c *gin.Context) {
	data, err := h.useCase.GetFunnelMetrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *TelemetryHandler) GetErrors(c *gin.Context) {
	data, err := h.useCase.GetErrors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *TelemetryHandler) GetDatabaseStats(c *gin.Context) {
	data, err := h.useCase.GetDatabaseStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}
