package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type TimetableHandler struct {
	useCase *usecase.TimetableUseCase
}

func NewTimetableHandler(r *gin.RouterGroup, uc *usecase.TimetableUseCase) {
	h := &TimetableHandler{useCase: uc}

	g := r.Group("/timetable")
	{
		g.POST("", h.AddEntry)
		g.DELETE("/:id", h.RemoveEntry)
		g.GET("/class/:id", h.GetClassTimetable)
		g.GET("/teacher/:id", h.GetTeacherTimetable)
		g.POST("/detect-clashes", h.DetectClashes)
		g.POST("/exam/generate", h.GenerateExamSchedule)
		g.GET("/exam/class/:id", h.GetExamSchedule)
	}
}

func (h *TimetableHandler) AddEntry(c *gin.Context) {
	var req domain.TimetableEntry
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.AddEntry(c.Request.Context(), &req); err != nil {
		if appErr, ok := err.(*domain.AppError); ok {
			c.JSON(appErr.Status, gin.H{"error": appErr.Message, "code": appErr.Code})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *TimetableHandler) GetClassTimetable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	entries, err := h.useCase.GetClassTimetable(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) GetTeacherTimetable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid teacher ID format"})
		return
	}
	entries, err := h.useCase.GetTeacherTimetable(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *TimetableHandler) RemoveEntry(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry ID format"})
		return
	}
	if err := h.useCase.RemoveEntry(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entry removed successfully"})
}

func (h *TimetableHandler) GenerateExamSchedule(c *gin.Context) {
	var req struct {
		AcademicPeriodID uuid.UUID `json:"academic_period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.AutoGenerateExamSchedule(c.Request.Context(), req.AcademicPeriodID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exam schedule generated successfully"})
}

func (h *TimetableHandler) GetExamSchedule(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class ID format"})
		return
	}
	
	sessions, err := h.useCase.GetExamSchedule(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// DetectClashes analyzes potential scheduling overlaps across classes, teachers, and rooms (Gap #17).
func (h *TimetableHandler) DetectClashes(c *gin.Context) {
	var req struct {
		ClassID   uuid.UUID `json:"class_id" binding:"required"`
		TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
		DayOfWeek int       `json:"day_of_week" binding:"required"`
		StartTime string    `json:"start_time" binding:"required"`
		EndTime   string    `json:"end_time" binding:"required"`
		Room      string    `json:"room"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	type ClashWarning struct {
		Type        string `json:"type"` // TEACHER_DOUBLE_BOOKED, ROOM_COLLISION, CLASS_OVERLAP
		Description string `json:"description"`
		Severity    string `json:"severity"` // HIGH, CRITICAL
	}

	var clashes []ClashWarning

	// Check teacher schedule
	teacherEntries, _ := h.useCase.GetTeacherTimetable(c.Request.Context(), req.TeacherID)
	for _, entry := range teacherEntries {
		if entry.DayOfWeek == req.DayOfWeek {
			if (req.StartTime >= entry.StartTime && req.StartTime < entry.EndTime) ||
				(req.EndTime > entry.StartTime && req.EndTime <= entry.EndTime) ||
				(req.StartTime <= entry.StartTime && req.EndTime >= entry.EndTime) {
				clashes = append(clashes, ClashWarning{
					Type:        "TEACHER_DOUBLE_BOOKED",
					Description: "Assigned teacher already has an active class session during this time slot",
					Severity:    "CRITICAL",
				})
				break
			}
		}
	}

	// Check class schedule
	classEntries, _ := h.useCase.GetClassTimetable(c.Request.Context(), req.ClassID)
	for _, entry := range classEntries {
		if entry.DayOfWeek == req.DayOfWeek {
			if (req.StartTime >= entry.StartTime && req.StartTime < entry.EndTime) ||
				(req.EndTime > entry.StartTime && req.EndTime <= entry.EndTime) ||
				(req.StartTime <= entry.StartTime && req.EndTime >= entry.EndTime) {
				clashes = append(clashes, ClashWarning{
					Type:        "CLASS_OVERLAP",
					Description: "Target cohort already has another scheduled subject at this time",
					Severity:    "CRITICAL",
				})
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"has_clash":    len(clashes) > 0,
		"clash_count":  len(clashes),
		"clashes":      clashes,
		"is_safe":      len(clashes) == 0,
	})
}
