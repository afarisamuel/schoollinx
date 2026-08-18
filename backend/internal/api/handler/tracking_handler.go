package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type TrackingHandler struct {
	uc *usecase.TrackingUseCase
}

func NewTrackingHandler(rg *gin.RouterGroup, uc *usecase.TrackingUseCase) *TrackingHandler {
	h := &TrackingHandler{uc: uc}

	g := rg.Group("/logistics/routes/:id/location")
	{
		g.POST("", h.RecordPing)
		g.GET("", h.GetLocation)
		g.GET("/history", h.GetHistory)
	}

	return h
}

func (h *TrackingHandler) RecordPing(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid route id"})
		return
	}

	var req domain.BusLocation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.RouteID = routeID

	if err := h.uc.RecordPing(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *TrackingHandler) GetLocation(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid route id"})
		return
	}

	loc, err := h.uc.GetLatestLocation(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "location not found"})
		return
	}
	c.JSON(http.StatusOK, loc)
}

func (h *TrackingHandler) GetHistory(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid route id"})
		return
	}

	// Default to last 1 hour
	sinceStr := c.Query("since")
	var since time.Time
	if sinceStr != "" {
		parsed, err := time.Parse(time.RFC3339, sinceStr)
		if err == nil {
			since = parsed
		} else {
			since = time.Now().Add(-1 * time.Hour)
		}
	} else {
		since = time.Now().Add(-1 * time.Hour)
	}

	history, err := h.uc.GetRouteHistory(c.Request.Context(), routeID, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}
