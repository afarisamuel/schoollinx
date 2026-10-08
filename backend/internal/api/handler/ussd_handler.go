package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
)

type USSDHandler struct {
	ussdUseCase domain.USSDUseCase
}

func NewUSSDHandler(publicGroup *gin.RouterGroup, ussdUseCase domain.USSDUseCase) *USSDHandler {
	h := &USSDHandler{
		ussdUseCase: ussdUseCase,
	}

	ussdGroup := publicGroup.Group("/ussd")
	{
		ussdGroup.POST("/arkesel", h.HandleArkeselUSSD)
		ussdGroup.POST("/callback", h.HandleGenericUSSD)
		ussdGroup.POST("/simulate", h.SimulateUSSD)
		ussdGroup.GET("/sessions/:id", h.GetSessionDebug)
	}

	return h
}

// HandleArkeselUSSD processes webhook hits from Arkesel USSD Gateway
func (h *USSDHandler) HandleArkeselUSSD(c *gin.Context) {
	var req domain.USSDRequest

	if err := c.ShouldBind(&req); err != nil {
		logger.Warn("Failed to bind Arkesel USSD payload", zap.Error(err))
		c.JSON(http.StatusOK, domain.USSDResponse{
			Message:         "Invalid request format. Please try again.",
			ContinueSession: false,
		})
		return
	}

	resp, err := h.ussdUseCase.ProcessRequest(c.Request.Context(), &req)
	if err != nil {
		logger.Error("USSD processing error", err, zap.String("sessionID", req.SessionID))
		c.JSON(http.StatusOK, domain.USSDResponse{
			SessionID:       req.SessionID,
			UserID:          req.GetPhoneNumber(),
			Message:         "An error occurred while processing your request. Please try again later.",
			ContinueSession: false,
		})
		return
	}

	// Arkesel accepts JSON with sessionID, userID, message, continueSession
	c.JSON(http.StatusOK, resp)
}

// HandleGenericUSSD processes standard USSD gateway callbacks
func (h *USSDHandler) HandleGenericUSSD(c *gin.Context) {
	var req domain.USSDRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Invalid request", "continueSession": false})
		return
	}

	resp, err := h.ussdUseCase.ProcessRequest(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "System temporarily unavailable", "continueSession": false})
		return
	}

	// If gateway expects plain text "CON <msg>" or "END <msg>"
	if strings.Contains(c.GetHeader("Accept"), "text/plain") {
		prefix := "CON "
		if !resp.ContinueSession {
			prefix = "END "
		}
		c.String(http.StatusOK, prefix+resp.Message)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// SimulateUSSD allows frontend UI or developers to simulate USSD interactions
func (h *USSDHandler) SimulateUSSD(c *gin.Context) {
	var req domain.USSDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid simulation payload: " + err.Error()})
		return
	}

	resp, err := h.ussdUseCase.ProcessRequest(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetSessionDebug returns the current state of a USSD session for debugging
func (h *USSDHandler) GetSessionDebug(c *gin.Context) {
	sessionID := c.Param("id")
	session, exists := h.ussdUseCase.GetSession(sessionID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found or expired"})
		return
	}

	c.JSON(http.StatusOK, session)
}
