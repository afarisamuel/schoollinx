package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/pdf"
)

func (h *ReportHandler) GenerateTerminalReportHandler(c *gin.Context) {
	ctx := c.Request.Context()
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	periodIDStr := c.Query("period_id")
	termIDStr := c.Query("term_id")
	var periodID uuid.UUID
	var termID uuid.UUID
	var activePeriod *domain.AcademicPeriod

	if periodIDStr != "" && termIDStr != "" {
		periodID, err = uuid.Parse(periodIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid period_id"})
			return
		}
		termID, err = uuid.Parse(termIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid term_id"})
			return
		}
	} else {
		// Fallback to active period and term
		activePeriod, err = h.academicRepo.GetActive(ctx)
		if err != nil || activePeriod == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "period_id and term_id are required and no active period found"})
			return
		}
		periodID = activePeriod.ID
		// Just pick the active term from the period if possible
		if len(activePeriod.Terms) > 0 {
		    for _, t := range activePeriod.Terms {
		        if t.TermNumber == activePeriod.CurrentTerm {
		            termID = t.ID
		            break
		        }
		    }
		    if termID == uuid.Nil {
		        termID = activePeriod.Terms[0].ID
		    }
		} else {
		    c.JSON(http.StatusBadRequest, gin.H{"error": "active period has no terms"})
		    return
		}
	}

	tenantID := ctx.Value(middleware.TenantIDKey).(uuid.UUID)
	tenant, err := h.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load tenant info"})
		return
	}

	student, err := h.studentRepo.GetByID(ctx, studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	grades, err := h.gradeRepo.GetByStudentID(ctx, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch grades"})
		return
	}

	eval, _ := h.evalRepo.GetByStudentAndTerm(ctx, studentID, periodID, termID)

	// Look up the class teacher for this student
	var classTeacher *domain.Teacher
	if student.ClassID != nil {
		class, err := h.classRepo.GetByID(ctx, *student.ClassID)
		if err == nil && class != nil && class.TeacherID != nil {
			classTeacher, _ = h.teacherRepo.GetByID(ctx, *class.TeacherID)
		}
	}

	// Mock attendance for now, ideally fetch from attendance repo
	attendance := map[string]int{"present": 50, "absent": 2}

	data := pdf.TerminalReportData{
		Student:        student,
		Tenant:         tenant,
		ClassTeacher:   classTeacher,
		Grades:         grades,
		Evaluation:     eval,
		Attendance:     attendance,
		Term:           "Term 3", 
		ClassSize:      35,
		NextTermBegins: "05 Sept 2026",
		PromotedTo:     fmt.Sprintf("Level %d", student.Level+1),
	}

	c.Header("Content-Type", "application/pdf")
	filename := fmt.Sprintf("Terminal_Report_%s.pdf", studentID.String())
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := h.pdfService.GenerateTerminalReport(c.Writer, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate terminal report"})
		return
	}
}
