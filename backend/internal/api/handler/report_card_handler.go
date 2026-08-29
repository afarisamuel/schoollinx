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

		// Feature 1: AI Remarks Generator
		g.POST("/ai-remarks", h.GenerateAIRemarks)

		// Feature 2: Competency-Based Assessment (CBE / NaCCA)
		g.GET("/competencies/rubrics", h.ListRubrics)
		g.POST("/competencies/rubrics", h.CreateRubric)
		g.POST("/competencies/evaluations", h.SaveEvaluation)
		g.GET("/competencies/students/:id", h.GetStudentEvaluations)

		// Feature 5: Transcript Verification (also public route)
		g.GET("/verify/:hash", h.VerifyTranscript)

		// Feature 7: Special Needs / IEP Tracker
		g.GET("/iep/students/:id", h.GetStudentIEP)
		g.POST("/iep", h.CreateIEPPlan)
		g.POST("/iep/:id/milestones", h.AddIEPMilestone)
		g.PATCH("/iep/milestones/:id", h.UpdateIEPMilestone)
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

	c.JSON(http.StatusOK, gin.H{"message": "report card published"})
}

// GenerateAIRemarks produces personalized teacher remarks
func (h *ReportCardHandler) GenerateAIRemarks(c *gin.Context) {
	var req struct {
		StudentName   string  `json:"student_name" binding:"required"`
		GPA           float64 `json:"gpa"`
		AttendancePct float64 `json:"attendance_pct"`
		TopSubject    string  `json:"top_subject"`
		LowSubject    string  `json:"low_subject"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	remarks := h.uc.GenerateAIRemarks(req.StudentName, req.GPA, req.AttendancePct, req.TopSubject, req.LowSubject)
	c.JSON(http.StatusOK, gin.H{"remarks": remarks})
}

// VerifyTranscript allows verifiers to validate report cards via hash
func (h *ReportCardHandler) VerifyTranscript(c *gin.Context) {
	hash := c.Param("hash")
	if hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing verification hash"})
		return
	}

	report, err := h.uc.VerifyTranscript(c.Request.Context(), hash)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"valid":   false,
			"message": "Transcript record not found or hash invalid",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":             true,
		"verification_hash": report.VerificationHash,
		"status":            report.Status,
		"overall_score":     report.OverallScore,
		"attendance_rate":   report.AttendanceRate,
		"generated_at":      report.GeneratedAt,
	})
}

// Competency Rubrics
func (h *ReportCardHandler) ListRubrics(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	rubrics, err := h.uc.ListRubrics(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rubrics)
}

func (h *ReportCardHandler) CreateRubric(c *gin.Context) {
	var req domain.CompetencyRubric
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreateRubric(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ReportCardHandler) SaveEvaluation(c *gin.Context) {
	var req domain.CompetencyEvaluation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.SaveEvaluation(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (h *ReportCardHandler) GetStudentEvaluations(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	periodID, _ := uuid.Parse(c.Query("period_id"))
	evals, err := h.uc.ListStudentEvaluations(c.Request.Context(), studentID, periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, evals)
}

// IEP Special Needs
func (h *ReportCardHandler) GetStudentIEP(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	plan, err := h.uc.GetStudentIEP(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active IEP plan found"})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (h *ReportCardHandler) CreateIEPPlan(c *gin.Context) {
	var req domain.IEPPlan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreateIEPPlan(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ReportCardHandler) AddIEPMilestone(c *gin.Context) {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plan ID"})
		return
	}

	var req domain.IEPMilestone
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.PlanID = planID

	if err := h.uc.AddIEPMilestone(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ReportCardHandler) UpdateIEPMilestone(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone ID"})
		return
	}

	var req struct {
		Achieved bool   `json:"achieved"`
		Notes    string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.uc.UpdateIEPMilestone(c.Request.Context(), id, req.Achieved, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "milestone updated"})
}
