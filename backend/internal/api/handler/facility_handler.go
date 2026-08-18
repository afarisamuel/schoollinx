package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type FacilityHandler struct {
	facilityUseCase domain.FacilityUseCase
}

func NewFacilityHandler(r *gin.RouterGroup, usecase domain.FacilityUseCase) {
	handler := &FacilityHandler{facilityUseCase: usecase}

	facility := r.Group("/facility")
	{
		// Inventory / Assets
		facility.GET("/inventory", handler.GetInventory)
		facility.POST("/inventory", handler.AddInventory)
		facility.PUT("/inventory/:id/quantity", handler.AdjustInventory)
		facility.PUT("/inventory/:id", handler.UpdateAsset)
		facility.DELETE("/inventory/:id", handler.DeleteInventory)

		// Visitors
		facility.GET("/visitors", handler.GetVisitors)
		facility.POST("/visitors/check-in", handler.CheckInVisitor)
		facility.PUT("/visitors/:id/check-out", handler.CheckOutVisitor)

		// Rooms & Bookings
		facility.GET("/rooms", handler.GetRooms)
		facility.POST("/rooms", handler.AddRoom)
		facility.GET("/rooms/:id/schedule", handler.GetRoomSchedule)
		facility.POST("/rooms/:id/book", handler.BookRoom)
		facility.DELETE("/bookings/:id", handler.CancelBooking)
		
		// Usage & Heatmap
		facility.POST("/usage", handler.LogFacilityUsage)
		facility.GET("/heatmap", handler.GetResourceHeatmap)
	}
}

// Inventory Handlers
func (h *FacilityHandler) GetInventory(c *gin.Context) {
	items, err := h.facilityUseCase.GetAllInventory(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *FacilityHandler) AddInventory(c *gin.Context) {
	var item domain.InventoryItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.facilityUseCase.AddInventoryItem(c.Request.Context(), &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *FacilityHandler) AdjustInventory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}

	var payload struct {
		Quantity int `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.facilityUseCase.AdjustInventory(c.Request.Context(), id, payload.Quantity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "inventory adjusted"})
}

func (h *FacilityHandler) DeleteInventory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}
	if err := h.facilityUseCase.RemoveInventoryItem(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "inventory item deleted"})
}

// Visitor Handlers
func (h *FacilityHandler) GetVisitors(c *gin.Context) {
	dateStr := c.Query("date")
	var targetDate time.Time
	var err error

	if dateStr == "" {
		targetDate = time.Now()
	} else {
		targetDate, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format. Use YYYY-MM-DD"})
			return
		}
	}

	logs, err := h.facilityUseCase.GetDailyVisitors(c.Request.Context(), targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *FacilityHandler) CheckInVisitor(c *gin.Context) {
	var log domain.VisitorLog
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.facilityUseCase.RegisterVisitor(c.Request.Context(), &log); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, log)
}

func (h *FacilityHandler) CheckOutVisitor(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}
	if err := h.facilityUseCase.SignOutVisitor(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "visitor checked out"})
}

func (h *FacilityHandler) UpdateAsset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}
	var item domain.InventoryItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item.ID = id
	if err := h.facilityUseCase.UpdateAsset(c.Request.Context(), &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

// Room Booking Handlers
func (h *FacilityHandler) GetRooms(c *gin.Context) {
	rooms, err := h.facilityUseCase.GetAllRooms(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rooms)
}

func (h *FacilityHandler) AddRoom(c *gin.Context) {
	var room domain.Room
	if err := c.ShouldBindJSON(&room); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.facilityUseCase.AddRoom(c.Request.Context(), &room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, room)
}

func (h *FacilityHandler) GetRoomSchedule(c *gin.Context) {
	roomID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room ID"})
		return
	}
	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format. Use YYYY-MM-DD"})
		return
	}
	bookings, err := h.facilityUseCase.GetRoomSchedule(c.Request.Context(), roomID, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bookings)
}

func (h *FacilityHandler) BookRoom(c *gin.Context) {
	roomID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room ID"})
		return
	}
	var booking domain.RoomBooking
	if err := c.ShouldBindJSON(&booking); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	booking.RoomID = roomID
	if err := h.facilityUseCase.BookRoom(c.Request.Context(), &booking); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, booking)
}

func (h *FacilityHandler) CancelBooking(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking ID"})
		return
	}
	if err := h.facilityUseCase.CancelBooking(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "booking cancelled"})
}

func (h *FacilityHandler) LogFacilityUsage(c *gin.Context) {
	var log domain.FacilityUsageLog
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.facilityUseCase.LogFacilityUsage(c.Request.Context(), &log); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, log)
}

func (h *FacilityHandler) GetResourceHeatmap(c *gin.Context) {
	heatmap, err := h.facilityUseCase.GetResourceHeatmap(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, heatmap)
}
