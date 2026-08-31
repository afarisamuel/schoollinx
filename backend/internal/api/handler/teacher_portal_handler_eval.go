package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

func (h *TeacherPortalHandler) GetStudentEvaluation(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	periodIDStr := c.Query("period_id")
	termIDStr := c.Query("term_id")
	if periodIDStr == "" || termIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "period_id and term_id are required"})
		return
	}

	periodID, err := uuid.Parse(periodIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period_id"})
		return
	}

	termID, err := uuid.Parse(termIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid term_id"})
		return
	}

	eval, err := h.evalRepo.GetByStudentAndTerm(c.Request.Context(), studentID, periodID, termID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluation"})
		return
	}

	if eval == nil {
		// Return empty evaluation rather than 404 to allow UI to show blank form
		c.JSON(http.StatusOK, domain.TerminalEvaluation{
			StudentID:        studentID,
			AcademicPeriodID: periodID,
			TermID:           termID,
		})
		return
	}

	c.JSON(http.StatusOK, eval)
}

func (h *TeacherPortalHandler) UpdateStudentEvaluation(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	var req domain.TerminalEvaluation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	req.StudentID = studentID

	// Headmaster Remark is restricted to Admin or designated Headmaster
	userRoleVal, _ := c.Get("userRole")
	role, _ := userRoleVal.(domain.Role)
	isHeadmasterOrAdmin := role == domain.RoleAdmin || role == domain.RoleHeadmaster || role == domain.RoleEcopowerAdmin || role == domain.RoleITAdmin

	if !isHeadmasterOrAdmin {
		// Regular teacher: preserve existing HeadTeacherRemark so teachers cannot overwrite it
		existing, _ := h.evalRepo.GetByStudentAndTerm(c.Request.Context(), studentID, req.AcademicPeriodID, req.TermID)
		if existing != nil {
			req.HeadTeacherRemark = existing.HeadTeacherRemark
		} else {
			req.HeadTeacherRemark = ""
		}
	}

	if err := h.evalRepo.Upsert(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save evaluation"})
		return
	}

	c.JSON(http.StatusOK, req)
}
