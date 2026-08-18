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
		g.POST("/bookings", h.BookResource)
		g.GET("/bookings/me", h.MyBookings)
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

type bookRequest struct {
	ResourceID uuid.UUID `json:"resource_id" binding:"required"`
	StartTime  time.Time `json:"start_time" binding:"required"`
	EndTime    time.Time `json:"end_time" binding:"required"`
}

func (h *ResourceHandler) BookResource(c *gin.Context) {
	var req bookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get UserID from auth middleware
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
	}

	if err := h.useCase.BookResource(c.Request.Context(), booking); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, booking)
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
