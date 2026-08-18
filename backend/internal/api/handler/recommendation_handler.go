package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type RecommendationHandler struct {
	recEngine domain.RecommendationEngine
}

func NewRecommendationHandler(r *gin.RouterGroup, re domain.RecommendationEngine) {
	h := &RecommendationHandler{recEngine: re}

	g := r.Group("/insights")
	{
		g.GET("/students/:id/learning-path", h.GetLearningPath)
		g.POST("/students/:id/generate", h.GenerateForStudent)
		g.POST("/admin/generate-all", h.GenerateBatchInsights)
	}
}

func (h *RecommendationHandler) GetLearningPath(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	path, err := h.recEngine.GetLearningPath(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, path)
}

func (h *RecommendationHandler) GenerateForStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	if err := h.recEngine.GenerateInsights(c.Request.Context(), studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "insights generated successfully"})
}

func (h *RecommendationHandler) GenerateBatchInsights(c *gin.Context) {
	// In a real production system, this would spin off into a separate goroutine
	// or message queue worker to prevent holding the HTTP connection open.
	go func() {
		// Create a background context with timeout or distinct tracing if needed
		// For prototyping, the naive goroutine suffices
		_ = h.recEngine.GenerateAllInsights(context.Background())
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "Batch insight generation queued",
		"message": "The predictive engine is processing all active students asynchronously in the background.",
	})
}
