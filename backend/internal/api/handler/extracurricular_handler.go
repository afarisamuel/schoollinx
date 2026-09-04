package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ExtracurricularHandler struct {
	useCase domain.ExtracurricularUseCase
}

func NewExtracurricularHandler(r *gin.RouterGroup, uc domain.ExtracurricularUseCase) {
	h := &ExtracurricularHandler{useCase: uc}

	g := r.Group("/extracurricular")
	{
		g.GET("/clubs", h.ListClubs)
		g.POST("/clubs", h.CreateClub)
		g.GET("/my-clubs", h.GetMyClubs)
		g.POST("/clubs/:id/join", h.JoinClub)
		g.POST("/clubs/:id/leave", h.LeaveClub)
		g.GET("/events", h.ListEvents)
		g.POST("/events", h.ScheduleEvent)
	}
}

func (h *ExtracurricularHandler) CreateClub(c *gin.Context) {
	var club domain.Club
	if err := c.ShouldBindJSON(&club); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if club.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Club name is required"})
		return
	}

	if club.Category == "" {
		club.Category = domain.CategoryAcademic
	}

	if err := h.useCase.CreateClub(c.Request.Context(), &club); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, club)
}

func (h *ExtracurricularHandler) ListClubs(c *gin.Context) {
	clubs, err := h.useCase.ListClubs(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, clubs)
}

func (h *ExtracurricularHandler) GetMyClubs(c *gin.Context) {
	// Get StudentID from Auth
	studentID := uuid.Nil
	if val, ok := c.Get("userID"); ok {
		if uid, ok := val.(uuid.UUID); ok {
			studentID = uid
		}
	}

	if studentID == uuid.Nil {
		c.JSON(http.StatusOK, []domain.Club{})
		return
	}

	clubs, err := h.useCase.GetStudentClubs(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, clubs)
}

func (h *ExtracurricularHandler) JoinClub(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid club ID format"})
		return
	}

	// Get StudentID from Auth
	studentID := uuid.Nil
	if val, ok := c.Get("userID"); ok {
		if uid, ok := val.(uuid.UUID); ok {
			studentID = uid
		}
	}
	if studentID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context missing"})
		return
	}

	if err := h.useCase.JoinClub(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "joined"})
}

func (h *ExtracurricularHandler) LeaveClub(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid club ID format"})
		return
	}
	studentID := uuid.Nil
	if val, ok := c.Get("userID"); ok {
		if uid, ok := val.(uuid.UUID); ok {
			studentID = uid
		}
	}
	if studentID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context missing"})
		return
	}

	if err := h.useCase.LeaveClub(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "left"})
}

func (h *ExtracurricularHandler) ListEvents(c *gin.Context) {
	// Default to upcoming 30 days
	start := time.Now()
	end := start.AddDate(0, 1, 0)

	events, err := h.useCase.ListEvents(c.Request.Context(), start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, events)
}

func (h *ExtracurricularHandler) ScheduleEvent(c *gin.Context) {
	var event domain.Event
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.ScheduleEvent(c.Request.Context(), &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}
