package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ResourceHandler struct {
	useCase domain.ResourceUseCase
}

func NewResourceHandler(r *gin.RouterGroup, uc domain.ResourceUseCase) {
	h := &ResourceHandler{useCase: uc}

	g := r.Group("/resources")
	{
		g.GET("", h.ListResources)
		g.GET("/:id", h.GetResource)
		g.POST("", h.CreateResource)
		g.PUT("/:id", h.UpdateResource)
		g.DELETE("/:id", h.DeleteResource)
		g.POST("/seed-defaults", h.SeedDefaults)

		g.POST("/bookings", h.BookResource)
		g.GET("/bookings/me", h.MyBookings)
		g.GET("/bookings/all", h.AllBookings)
		g.POST("/bookings/:id/cancel", h.CancelBooking)
	}
}

func (h *ResourceHandler) ListResources(c *gin.Context) {
	resources, err := h.useCase.ListResources(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

func (h *ResourceHandler) GetResource(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	res, err := h.useCase.GetResource(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *ResourceHandler) CreateResource(c *gin.Context) {
	var res domain.Resource
	if err := c.ShouldBindJSON(&res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateResource(c.Request.Context(), &res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, res)
}

func (h *ResourceHandler) UpdateResource(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	var res domain.Resource
	if err := c.ShouldBindJSON(&res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res.ID = id

	if err := h.useCase.UpdateResource(c.Request.Context(), &res); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ResourceHandler) DeleteResource(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	if err := h.useCase.DeleteResource(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Resource deleted successfully"})
}

func (h *ResourceHandler) SeedDefaults(c *gin.Context) {
	resources, err := h.useCase.SeedDefaultResources(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

type bookRequest struct {
	ResourceID uuid.UUID `json:"resource_id" binding:"required"`
	StartTime  time.Time `json:"start_time" binding:"required"`
	EndTime    time.Time `json:"end_time" binding:"required"`
	Purpose    string    `json:"purpose"`
	Headcount  int       `json:"headcount"`
	Notes      string    `json:"notes"`
}

func (h *ResourceHandler) BookResource(c *gin.Context) {
	var req bookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := uuid.Nil
	if val, ok := c.Get("userID"); ok {
		if uid, ok := val.(uuid.UUID); ok {
			userID = uid
		}
	}

	booking := &domain.Booking{
		ResourceID: req.ResourceID,
		UserID:     userID,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		Purpose:    req.Purpose,
		Headcount:  req.Headcount,
		Notes:      req.Notes,
	}

	if err := h.useCase.BookResource(c.Request.Context(), booking); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

func (h *ResourceHandler) CancelBooking(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid booking ID"})
		return
	}

	if err := h.useCase.CancelBooking(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled successfully"})
}

func (h *ResourceHandler) MyBookings(c *gin.Context) {
	userID := uuid.Nil
	if val, ok := c.Get("userID"); ok {
		if uid, ok := val.(uuid.UUID); ok {
			userID = uid
		}
	}

	bookings, err := h.useCase.MyBookings(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bookings)
}

func (h *ResourceHandler) AllBookings(c *gin.Context) {
	bookings, err := h.useCase.AllBookings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bookings)
}
