package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type ReportCardHandler struct {
	uc *usecase.ReportCardUseCase
}

func NewReportCardHandler(rg *gin.RouterGroup, uc *usecase.ReportCardUseCase) *ReportCardHandler {
	h := &ReportCardHandler{uc: uc}

	g := rg.Group("/reports")
	{
		g.POST("/templates", h.CreateTemplate)
		g.GET("/templates", h.ListTemplates)
		
		g.POST("/generate", h.GenerateReportCard)
		g.GET("/students/:id", h.GetStudentReports)
		g.POST("/:id/publish", h.PublishReport)
	}

	return h
}

func (h *ReportCardHandler) CreateTemplate(c *gin.Context) {
	var req domain.ReportCardTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreateTemplate(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *ReportCardHandler) ListTemplates(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))

	templates, err := h.uc.ListTemplates(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, templates)
}

func (h *ReportCardHandler) GenerateReportCard(c *gin.Context) {
	var req domain.ReportCard
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.GenerateReportCard(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *ReportCardHandler) GetStudentReports(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	reports, err := h.uc.GetStudentReports(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reports)
}

func (h *ReportCardHandler) PublishReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
		return
	}

	var req struct {
		PDFURL string `json:"pdf_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.uc.PublishReport(c.Request.Context(), id, req.PDFURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "report published"})
}
