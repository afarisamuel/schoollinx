package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type AnalyticsHandler struct {
	useCase *usecase.AnalyticsUseCase
}

func NewAnalyticsHandler(r *gin.RouterGroup, uc *usecase.AnalyticsUseCase) {
	h := &AnalyticsHandler{useCase: uc}

	g := r.Group("/analytics")
	{
		g.GET("/attendance", h.GetAttendanceStats)
		g.GET("/grades", h.GetGradeDistribution)
		g.GET("/risk-alerts", h.GetAtRiskStudents)
		g.GET("/heatmap", h.GetResourceHeatmap)
		g.GET("/demographics", h.GetDemographics)
		g.GET("/anomalies", h.GetAttendanceAnomalies)
		g.GET("/executive-report", h.DownloadExecutiveReport)
	}
}

// GetDemographics godoc
// @Summary      Get enrollment demographics
// @Description  Returns student enrollment breakdown by grade/gender
// @Tags         Analytics
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/demographics [get]
func (h *AnalyticsHandler) GetDemographics(c *gin.Context) {
	stats, err := h.useCase.GetDemographics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GetAttendanceStats godoc
// @Summary      Get attendance statistics
// @Description  Returns aggregated attendance counts (present, absent, late)
// @Tags         Analytics
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/attendance [get]
func (h *AnalyticsHandler) GetAttendanceStats(c *gin.Context) {
	stats, err := h.useCase.GetAttendanceStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GetGradeDistribution godoc
// @Summary      Get grade distribution
// @Description  Returns grade distribution across all classes and subjects
// @Tags         Analytics
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/grades [get]
func (h *AnalyticsHandler) GetGradeDistribution(c *gin.Context) {
	dist, err := h.useCase.GetGradeDistribution(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dist)
}

// GetAtRiskStudents godoc
// @Summary      Get at-risk students
// @Description  Returns students flagged by the weighted retention risk model (attendance 40%, grades 40%, conduct 20%)
// @Tags         Analytics
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/risk-alerts [get]
func (h *AnalyticsHandler) GetAtRiskStudents(c *gin.Context) {
	alerts, err := h.useCase.GetAtRiskStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alerts)
}

// GetResourceHeatmap godoc
// @Summary      Get resource utilisation heatmap
// @Description  Returns facility usage log data normalised into a room x day heatmap
// @Tags         Analytics
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/heatmap [get]
func (h *AnalyticsHandler) GetResourceHeatmap(c *gin.Context) {
	heatmap, err := h.useCase.GetResourceHeatmap(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, heatmap)
}

// GetAttendanceAnomalies godoc
// @Summary      Detect attendance anomalies
// @Description  Detects students with 3+ consecutive absences and correlated GPA drop
// @Tags         Analytics
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Failure      500  {object}  map[string]string
// @Router       /analytics/anomalies [get]
func (h *AnalyticsHandler) GetAttendanceAnomalies(c *gin.Context) {
	anomalies, err := h.useCase.DetectAttendanceAnomalies(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, anomalies)
}

// DownloadExecutiveReport godoc
// @Summary      Download executive PDF report
// @Description  Generates and downloads a PDF executive report with institutional KPIs
// @Tags         Analytics
// @Produce      application/pdf
// @Success      200  {string}  binary
// @Failure      500  {object}  map[string]string
// @Router       /analytics/executive-report [get]
func (h *AnalyticsHandler) DownloadExecutiveReport(c *gin.Context) {
	stats, err := h.useCase.GetDemographics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	attendance, err := h.useCase.GetAttendanceStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	riskAlerts, err := h.useCase.GetAtRiskStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pdfBytes, err := h.useCase.GenerateExecutiveReport(c.Request.Context(), stats, attendance, riskAlerts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=executive_report.pdf")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
