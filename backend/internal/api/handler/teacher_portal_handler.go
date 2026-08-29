package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

// TeacherPortalHandler provides self-service endpoints for authenticated Teachers.
type TeacherPortalHandler struct {
	portalUseCase domain.TeacherPortalUseCase
	evalRepo      domain.TerminalEvaluationRepository
}

func NewTeacherPortalHandler(
	rg *gin.RouterGroup,
	portalUseCase domain.TeacherPortalUseCase,
	evalRepo domain.TerminalEvaluationRepository,
) {
	h := &TeacherPortalHandler{
		portalUseCase: portalUseCase,
		evalRepo:      evalRepo,
	}

	portal := rg.Group("/teacher-portal")
	portal.GET("/my-classes", h.GetMyClasses)
	portal.GET("/my-classes/:class_id/students", h.GetClassStudents)
	portal.POST("/my-classes/:class_id/grades", h.BulkSubmitGrades)
	portal.GET("/my-classes/:class_id/grades", h.GetClassGrades)

	// Phase 18 Features
	portal.GET("/my-classes/:class_id/weights", h.GetClassWeights)
	portal.PUT("/my-classes/:class_id/weights", h.UpdateClassWeights)
	portal.GET("/my-classes/:class_id/gpa", h.GetClassGPA)
	portal.POST("/my-classes/:class_id/curve", h.CurveGrades)
	portal.GET("/grades/:grade_id/history", h.GetGradeHistory)
	portal.POST("/my-classes/:class_id/grades/import", h.ImportGradesCSV)
	portal.GET("/my-classes/:class_id/grades/export", h.ExportGradesPDF)
	
	// Evaluations
	portal.GET("/my-classes/:class_id/students/:student_id/evaluations", h.GetStudentEvaluation)
	portal.PUT("/my-classes/:class_id/students/:student_id/evaluations", h.UpdateStudentEvaluation)

	// Classroom Mastery Suite (Phase 1-3)
	portal.GET("/my-classes/:class_id/seating", h.GetSeatingChart)
	portal.POST("/my-classes/:class_id/seating", h.SaveSeatingChart)
	portal.GET("/my-classes/:class_id/lesson-plans", h.GetLessonPlans)
	portal.POST("/my-classes/:class_id/lesson-plans", h.CreateLessonPlan)
	portal.PUT("/lesson-plans/:id", h.UpdateLessonPlan)
	portal.GET("/rubrics", h.GetRubrics)
	portal.POST("/rubrics", h.CreateRubric)
	portal.POST("/sickbay-referrals", h.CreateSickbayReferral)
	portal.GET("/my-classes/:class_id/sickbay-referrals", h.GetClassReferrals)
	portal.GET("/my-classes/:class_id/resources", h.GetClassResources)
	portal.POST("/my-classes/:class_id/resources", h.CreateResource)

	// Teacher Substitution / Cover Requests (Feature 37)
	portal.GET("/cover-requests", h.GetCoverRequests)
	portal.POST("/cover-requests", h.CreateCoverRequest)
	portal.PUT("/cover-requests/:id/claim", h.ClaimCoverRequest)
}

// GetMyClasses returns all classes the currently logged-in teacher is assigned to teach.
func (h *TeacherPortalHandler) GetMyClasses(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userID := val.(uuid.UUID)

	teacher, assignments, err := h.portalUseCase.GetMyClasses(c.Request.Context(), userID)
	if err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "teacher profile not found for this user"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teacher":     teacher,
		"assignments": assignments,
	})
}

// GetClassStudents returns all enrolled students for a specific class.
func (h *TeacherPortalHandler) GetClassStudents(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	students, err := h.portalUseCase.GetClassStudents(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

// GetClassGrades returns all grades recorded for a specific class.
func (h *TeacherPortalHandler) GetClassGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	grades, err := h.portalUseCase.GetClassGrades(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, grades)
}

// GetClassWeights returns configured weight thresholds for a given class.
func (h *TeacherPortalHandler) GetClassWeights(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	weights, err := h.portalUseCase.GetClassWeights(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, weights)
}

// UpdateClassWeights bulk upserts category weights for a class.
func (h *TeacherPortalHandler) UpdateClassWeights(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	var weights []domain.GradeWeight
	if err := c.ShouldBindJSON(&weights); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.portalUseCase.UpdateClassWeights(c.Request.Context(), classID, weights); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update weights"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "weights successfully updated"})
}

// GetClassGPA retrieves auto-calculated weighted GPA averages across all class students.
func (h *TeacherPortalHandler) GetClassGPA(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	gpaList, err := h.portalUseCase.GetClassGPA(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gpaList)
}

// CurveGrades exposes the curve/scale methodology tool for normalizing challenging scores.
func (h *TeacherPortalHandler) CurveGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	var req struct {
		Term   string  `json:"term" binding:"required"`
		Method string  `json:"method" binding:"required"`
		Factor float64 `json:"factor"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.portalUseCase.CurveGrades(c.Request.Context(), classID, req.Term, req.Method, req.Factor); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "grades curved successfully"})
}

// GetGradeHistory returns the chronological tracking events for an individual score.
func (h *TeacherPortalHandler) GetGradeHistory(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("grade_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade ID format"})
		return
	}
	history, err := h.portalUseCase.GetGradeHistory(c.Request.Context(), gradeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

// BulkSubmitGrades accepts an array of grade entries for batch insertion/upsertion.
func (h *TeacherPortalHandler) BulkSubmitGrades(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	editorID := val.(uuid.UUID)

	var entries []domain.Grade
	if err := c.ShouldBindJSON(&entries); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	saved, err := h.portalUseCase.BulkSubmitGrades(c.Request.Context(), classID, editorID, entries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "grades saved successfully",
		"count":   len(saved),
		"grades":  saved,
	})
}

// ImportGradesCSV enables bulk ingestion from a teacher-provided CSV file.
func (h *TeacherPortalHandler) ImportGradesCSV(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}

	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	editorID := val.(uuid.UUID)

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read file: " + err.Error()})
		return
	}
	defer file.Close()

	imported, failures, warnings, err := h.portalUseCase.ImportGrades(c.Request.Context(), classID, editorID, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "CSV import completed",
		"imported": imported,
		"failures": failures,
		"warnings": warnings,
	})
}

// ExportGradesPDF creates a downloadable PDF summary of the entire term's gradebook.
func (h *TeacherPortalHandler) ExportGradesPDF(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	term := c.Query("term")
	if term == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term query parameter is required"})
		return
	}

	class, students, gpas, err := h.portalUseCase.GetClassForExport(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=gradebook-%s-%s.pdf", classID.String(), term))
	c.Header("Content-Type", "application/pdf")

	svc := pdf.NewPDFService()
	if err := svc.GenerateGradebookReport(c.Writer, class, term, students, gpas); err != nil {
		// Output Stream broken
		return
	}
}

// Classroom Mastery Suite (Phase 1-3)

func (h *TeacherPortalHandler) GetSeatingChart(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	chart, err := h.portalUseCase.GetSeatingChart(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if chart == nil {
		c.JSON(http.StatusOK, gin.H{"layout_json": "[]", "rows": 5, "columns": 6})
		return
	}
	c.JSON(http.StatusOK, chart)
}

func (h *TeacherPortalHandler) SaveSeatingChart(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var chart domain.SeatingChart
	if err := c.ShouldBindJSON(&chart); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	chart.ClassID = classID
	if err := h.portalUseCase.SaveSeatingChart(c.Request.Context(), &chart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, chart)
}

func (h *TeacherPortalHandler) GetLessonPlans(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	plans, err := h.portalUseCase.GetLessonPlans(c.Request.Context(), uuid.Nil, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func (h *TeacherPortalHandler) CreateLessonPlan(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var plan domain.LessonPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan.ClassID = classID
	if val, exists := c.Get("userID"); exists {
		plan.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateLessonPlan(c.Request.Context(), &plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func (h *TeacherPortalHandler) UpdateLessonPlan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid plan ID"})
		return
	}
	var plan domain.LessonPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan.ID = id
	if err := h.portalUseCase.UpdateLessonPlan(c.Request.Context(), &plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plan)
}

func (h *TeacherPortalHandler) GetRubrics(c *gin.Context) {
	rubrics, err := h.portalUseCase.GetRubrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rubrics)
}

func (h *TeacherPortalHandler) CreateRubric(c *gin.Context) {
	var rubric domain.GradingRubric
	if err := c.ShouldBindJSON(&rubric); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.portalUseCase.CreateRubric(c.Request.Context(), &rubric); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rubric)
}

func (h *TeacherPortalHandler) CreateSickbayReferral(c *gin.Context) {
	var referral domain.SickbayReferral
	if err := c.ShouldBindJSON(&referral); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if val, exists := c.Get("userID"); exists {
		referral.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateSickbayReferral(c.Request.Context(), &referral); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, referral)
}

func (h *TeacherPortalHandler) GetClassReferrals(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	referrals, err := h.portalUseCase.GetClassReferrals(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, referrals)
}

func (h *TeacherPortalHandler) GetClassResources(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	resources, err := h.portalUseCase.GetClassResources(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

func (h *TeacherPortalHandler) CreateResource(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID"})
		return
	}
	var res domain.TeacherResource
	if err := c.ShouldBindJSON(&res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res.ClassID = classID
	if val, exists := c.Get("userID"); exists {
		res.TeacherID = val.(uuid.UUID)
	}
	if err := h.portalUseCase.CreateResource(c.Request.Context(), &res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// --- TeacherAssignmentHandler for completeness ---

type TeacherAssignmentHandler struct {
	teacherRepo domain.TeacherRepository
}

func NewTeacherAssignmentHandler(rg *gin.RouterGroup, repo domain.TeacherRepository) {
	h := &TeacherAssignmentHandler{teacherRepo: repo}

	a := rg.Group("/teacher-assignments")
	a.GET("", h.ListAll)
	a.POST("", h.Assign)
	a.POST("/bulk", h.BulkAssign)
	a.DELETE("/:id", h.Unassign)
}

func (h *TeacherAssignmentHandler) ListAll(c *gin.Context) {
	assignments, err := h.teacherRepo.GetAllAssignments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

func (h *TeacherAssignmentHandler) Assign(c *gin.Context) {
	var a domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.teacherRepo.AssignToClass(c.Request.Context(), &a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, a)
}

func (h *TeacherAssignmentHandler) BulkAssign(c *gin.Context) {
	var assignments []domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&assignments); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.teacherRepo.BulkAssignToClass(c.Request.Context(), assignments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Bulk assignments successful", "count": len(assignments)})
}

func (h *TeacherAssignmentHandler) Unassign(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment ID format"})
		return
	}
	if err := h.teacherRepo.UnassignFromClass(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "assignment removed"})
}

// Teacher Cover Requests (Feature 37)
func (h *TeacherPortalHandler) CreateCoverRequest(c *gin.Context) {
	var req domain.TeacherCoverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.portalUseCase.CreateCoverRequest(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cover request"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TeacherPortalHandler) GetCoverRequests(c *gin.Context) {
	requests, err := h.portalUseCase.GetCoverRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cover requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *TeacherPortalHandler) ClaimCoverRequest(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cover request ID"})
		return
	}

	var body struct {
		CoverTeacherID string `json:"cover_teacher_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cover teacher ID required"})
		return
	}

	coverTeacherID, err := uuid.Parse(body.CoverTeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	if err := h.portalUseCase.ClaimCoverRequest(c.Request.Context(), id, coverTeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to claim cover request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "CLAIMED"})
}
