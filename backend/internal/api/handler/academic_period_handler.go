package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

// termInput is a DTO that accepts plain YYYY-MM-DD date strings from the frontend.
type termInput struct {
	ID         string `json:"id"`
	TermNumber int    `json:"term_number"`
	Name       string `json:"name"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
}

func parseDateString(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

type AcademicPeriodHandler struct {
	useCase domain.AcademicPeriodUseCase
}

func NewAcademicPeriodHandler(r *gin.RouterGroup, useCase domain.AcademicPeriodUseCase) {
	h := &AcademicPeriodHandler{useCase: useCase}

	g := r.Group("/academic-periods")
	{
		g.POST("", h.CreatePeriod)
		g.GET("", h.GetAllPeriods)
		g.GET("/active", h.GetActivePeriod)
		g.GET("/:id", h.GetPeriodByID)
		g.PUT("/:id", h.UpdatePeriod)
		g.DELETE("/:id", h.DeletePeriod)
		g.PATCH("/:id/activate", h.ActivatePeriod)

		// Academic Term Calendar routes
		g.POST("/:id/terms", h.CreateTerm)
		g.GET("/:id/terms", h.GetTermsByPeriod)
		g.PUT("/terms/:term_id", h.UpdateTerm)
		g.DELETE("/terms/:term_id", h.DeleteTerm)
		g.PATCH("/:id/terms/:term_id/activate", h.ActivateTerm)
		g.PATCH("/terms/:term_id/lock", h.ToggleTermLock)
	}
}

func (h *AcademicPeriodHandler) CreatePeriod(c *gin.Context) {
	var ap domain.AcademicPeriod
	if err := c.ShouldBindJSON(&ap); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreatePeriod(c.Request.Context(), &ap); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ap)
}

func (h *AcademicPeriodHandler) GetAllPeriods(c *gin.Context) {
	periods, err := h.useCase.GetAllPeriods(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, periods)
}

func (h *AcademicPeriodHandler) GetActivePeriod(c *gin.Context) {
	period, err := h.useCase.GetActivePeriod(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active academic period found"})
		return
	}
	c.JSON(http.StatusOK, period)
}

func (h *AcademicPeriodHandler) GetPeriodByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	period, err := h.useCase.GetPeriodByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, period)
}

func (h *AcademicPeriodHandler) UpdatePeriod(c *gin.Context) {
	var ap domain.AcademicPeriod
	if err := c.ShouldBindJSON(&ap); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	ap.ID = id

	if err := h.useCase.UpdatePeriod(c.Request.Context(), &ap); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ap)
}

func (h *AcademicPeriodHandler) DeletePeriod(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeletePeriod(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic period deleted"})
}

func (h *AcademicPeriodHandler) ActivatePeriod(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.ActivatePeriod(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic period activated"})
}

// Academic Term Calendar Handlers

func (h *AcademicPeriodHandler) CreateTerm(c *gin.Context) {
	periodID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID format"})
		return
	}

	var input termInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := parseDateString(input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
		return
	}
	endDate, err := parseDateString(input.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD"})
		return
	}

	term := domain.AcademicTerm{
		AcademicPeriodID: periodID,
		TermNumber:       input.TermNumber,
		Name:             input.Name,
		StartDate:        startDate,
		EndDate:          endDate,
	}

	if err := h.useCase.CreateTerm(c.Request.Context(), &term); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, term)
}

func (h *AcademicPeriodHandler) GetTermsByPeriod(c *gin.Context) {
	periodID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID format"})
		return
	}

	terms, err := h.useCase.GetTermsByPeriod(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, terms)
}

func (h *AcademicPeriodHandler) UpdateTerm(c *gin.Context) {
	termID, err := uuid.Parse(c.Param("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid term ID format"})
		return
	}

	var input termInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := parseDateString(input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
		return
	}
	endDate, err := parseDateString(input.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD"})
		return
	}

	term := domain.AcademicTerm{
		ID:         termID,
		TermNumber: input.TermNumber,
		Name:       input.Name,
		StartDate:  startDate,
		EndDate:    endDate,
	}

	if err := h.useCase.UpdateTerm(c.Request.Context(), &term); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, term)
}

func (h *AcademicPeriodHandler) DeleteTerm(c *gin.Context) {
	termID, err := uuid.Parse(c.Param("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid term ID format"})
		return
	}

	if err := h.useCase.DeleteTerm(c.Request.Context(), termID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Academic term deleted"})
}

func (h *AcademicPeriodHandler) ActivateTerm(c *gin.Context) {
	periodID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID format"})
		return
	}
	termID, err := uuid.Parse(c.Param("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid term ID format"})
		return
	}

	if err := h.useCase.ActivateTerm(c.Request.Context(), periodID, termID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Term activated"})
}

func (h *AcademicPeriodHandler) ToggleTermLock(c *gin.Context) {
	termID, err := uuid.Parse(c.Param("term_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid term ID format"})
		return
	}

	if err := h.useCase.ToggleTermLock(c.Request.Context(), termID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Term lock toggled"})
}

