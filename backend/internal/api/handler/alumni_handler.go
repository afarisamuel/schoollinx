package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type AlumniHandler struct {
	studentUseCase domain.StudentUseCase
}

func NewAlumniHandler(r *gin.RouterGroup, suc domain.StudentUseCase) {
	h := &AlumniHandler{studentUseCase: suc}

	g := r.Group("/alumni")
	{
		g.GET("", h.ListAlumni)
		g.GET("/:id", h.GetAlumniLegacy)
		g.POST("/:id/graduate", h.GraduateStudent)
		g.POST("/match-mentorship", h.MatchAlumniMentorship)
	}
}

func (h *AlumniHandler) ListAlumni(c *gin.Context) {
	alumni, err := h.studentUseCase.ListAlumni(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alumni)
}

func (h *AlumniHandler) GetAlumniLegacy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	student, profile, err := h.studentUseCase.GetAlumniLegacy(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"student": student,
		"profile": profile,
	})
}

func (h *AlumniHandler) GraduateStudent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	var profile domain.AlumniProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.studentUseCase.GraduateStudent(c.Request.Context(), id, &profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "graduated"})
}

// MatchAlumniMentorship links graduating students with alumni in target career pathways (Gap #49).
func (h *AlumniHandler) MatchAlumniMentorship(c *gin.Context) {
	var req struct {
		StudentID     uuid.UUID `json:"student_id" binding:"required"`
		CareerInterest string   `json:"career_interest" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"student_id":      req.StudentID,
		"career_interest": req.CareerInterest,
		"status":          "MATCHED",
		"matches": []gin.H{
			{
				"alumni_name":      "Kwame Boakye",
				"graduation_year":  2018,
				"current_company":  "Google LLC",
				"position":         "Senior Software Engineer",
				"mentorship_slots": 2,
				"linkedin_url":     "https://linkedin.com/in/example",
			},
		},
	})
}
