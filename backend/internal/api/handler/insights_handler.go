package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type InsightsHandler struct {
	academicUseCase domain.AcademicUseCase
}

func NewInsightsHandler(r *gin.RouterGroup, auc domain.AcademicUseCase) {
	h := &InsightsHandler{academicUseCase: auc}

	g := r.Group("/insights")
	{
		g.GET("/students/:id", h.GetStudentInsights)
		g.GET("/students/:id/score", h.GetSuccessScore)
		g.GET("/at-risk", h.GetAtRiskStudents)
	}
}

func (h *InsightsHandler) GetStudentInsights(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	insights, err := h.academicUseCase.GetStudentInsights(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, insights)
}

func (h *InsightsHandler) GetSuccessScore(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	score, err := h.academicUseCase.GetSuccessScore(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, score)
}

func (h *InsightsHandler) GetAtRiskStudents(c *gin.Context) {
	atRisk, err := h.academicUseCase.GetAtRiskStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, atRisk)
}
