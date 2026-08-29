package handler

import (
	"bytes"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type IntelligenceHandler struct {
	intelligenceUseCase domain.IntelligenceUseCase
}

func NewIntelligenceHandler(r *gin.RouterGroup, iuc domain.IntelligenceUseCase) {
	h := &IntelligenceHandler{
		intelligenceUseCase: iuc,
	}

	api := r.Group("/intelligence")
	{
		// Institutional KPIs visible to both Admins and Teachers
		api.GET("/kpis", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher), h.GetKPIs)

		// Advanced predictive analytics strictly restricted to ADMIN
		adminGroup := api.Group("")
		adminGroup.Use(middleware.RoleMiddleware(domain.RoleAdmin))
		{
			adminGroup.GET("/predictions/retention", h.GetRetentionRisks)
			adminGroup.GET("/predictions/demand", h.GetCourseDemand)
			adminGroup.GET("/export", h.ExportExecutiveSummary)
			adminGroup.POST("/interventions/generate", h.GenerateInterventions)
		}
	}
}

func (h *IntelligenceHandler) GetKPIs(c *gin.Context) {
	kpis, err := h.intelligenceUseCase.GetDashboardMetadata(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate institutional KPIs"})
		return
	}

	c.JSON(http.StatusOK, kpis)
}

func (h *IntelligenceHandler) GetRetentionRisks(c *gin.Context) {
	risks, err := h.intelligenceUseCase.AnalyzeRetentionRisk(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compute retention risks"})
		return
	}

	c.JSON(http.StatusOK, risks)
}

func (h *IntelligenceHandler) GetCourseDemand(c *gin.Context) {
	demands, err := h.intelligenceUseCase.ForecastCourseDemand(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to forecast course demand"})
		return
	}

	c.JSON(http.StatusOK, demands)
}

func (h *IntelligenceHandler) ExportExecutiveSummary(c *gin.Context) {
	csvData, err := h.intelligenceUseCase.GenerateExecutiveReportCSV(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate executive CSV export"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=executive_summary.csv")
	c.Data(http.StatusOK, "text/csv", bytes.NewBuffer(csvData).Bytes())
}

func (h *IntelligenceHandler) GenerateInterventions(c *gin.Context) {
	if err := h.intelligenceUseCase.GenerateInterventions(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate interventions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Interventions generated and alerts dispatched successfully"})
}
