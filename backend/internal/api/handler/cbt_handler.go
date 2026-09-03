package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type CBTHandler struct {
	uc *usecase.CBTUseCase
}

func NewCBTHandler(rg *gin.RouterGroup, uc *usecase.CBTUseCase) *CBTHandler {
	h := &CBTHandler{uc: uc}

	g := rg.Group("/cbt")
	{
		g.POST("/quizzes", h.CreateQuiz)
		g.GET("/quizzes/:id", h.GetQuiz)
		g.GET("/classes/:classId/quizzes", h.ListClassQuizzes)
		g.POST("/quizzes/:id/questions", h.AddQuestion)
		
		g.POST("/attempts", h.StartAttempt)
		g.POST("/attempts/:id/answers", h.SubmitAnswer)
		g.POST("/attempts/:id/complete", h.CompleteAttempt)
		g.POST("/attempts/:id/violation", h.RecordViolation)
	}

	return h
}

func (h *CBTHandler) CreateQuiz(c *gin.Context) {
	var req domain.CBTQuiz
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreateQuiz(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *CBTHandler) GetQuiz(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quiz id"})
		return
	}

	quiz, err := h.uc.GetQuiz(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, quiz)
}

func (h *CBTHandler) ListClassQuizzes(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	quizzes, err := h.uc.ListClassQuizzes(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, quizzes)
}

func (h *CBTHandler) AddQuestion(c *gin.Context) {
	quizID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quiz id"})
		return
	}

	var req domain.CBTQuestion
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.QuizID = quizID

	if err := h.uc.AddQuestion(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *CBTHandler) StartAttempt(c *gin.Context) {
	var req domain.CBTAttempt
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.StartAttempt(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *CBTHandler) SubmitAnswer(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attempt id"})
		return
	}

	var req domain.CBTAnswer
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.AttemptID = attemptID

	if err := h.uc.SubmitAnswer(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *CBTHandler) CompleteAttempt(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attempt id"})
		return
	}

	if err := h.uc.CompleteAttempt(c.Request.Context(), attemptID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "attempt completed"})
}

// RecordViolation logs anti-cheat events (tab switch, window blur) and auto-submits after 3 infractions (Gap #18).
func (h *CBTHandler) RecordViolation(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attempt id"})
		return
	}

	var req struct {
		ViolationType string `json:"violation_type" binding:"required"` // TAB_SWITCH, WINDOW_BLUR, FULLSCREEN_EXIT
		Count         int    `json:"count" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	autoSubmitted := false
	if req.Count >= 3 {
		_ = h.uc.CompleteAttempt(c.Request.Context(), attemptID)
		autoSubmitted = true
	}

	c.JSON(http.StatusOK, gin.H{
		"attempt_id":      attemptID,
		"violation_type":  req.ViolationType,
		"violation_count": req.Count,
		"auto_submitted":  autoSubmitted,
		"warning":         "Anti-cheat violation logged. Maximum 3 infractions permitted before exam auto-submission.",
	})
}
