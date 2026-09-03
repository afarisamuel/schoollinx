package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type HostelHandler struct {
	hostelUseCase domain.HostelUseCase
}

func NewHostelHandler(r *gin.RouterGroup, uc domain.HostelUseCase) *HostelHandler {
	h := &HostelHandler{hostelUseCase: uc}

	hostels := r.Group("/hostels")
	{
		hostels.GET("", h.GetAllHostels)
		hostels.POST("", h.CreateHostel)
		hostels.GET("/:id/rooms", h.GetRooms)
		hostels.POST("/:id/rooms", h.AddRoom)
		hostels.GET("/:id/capacity-overview", h.GetCapacityOverview)
		hostels.POST("/allocate", h.AllocateStudent)
		hostels.GET("/student/:student_id", h.GetStudentAllocation)
		hostels.POST("/student/:student_id/vacate", h.VacateStudent)
	}

	return h
}

func (h *HostelHandler) GetAllHostels(c *gin.Context) {
	hostels, err := h.hostelUseCase.GetAllHostels(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, hostels)
}

func (h *HostelHandler) CreateHostel(c *gin.Context) {
	var hostel domain.Hostel
	if err := c.ShouldBindJSON(&hostel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.hostelUseCase.CreateHostel(c.Request.Context(), &hostel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, hostel)
}

func (h *HostelHandler) GetRooms(c *gin.Context) {
	hostelID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hostel ID"})
		return
	}

	rooms, err := h.hostelUseCase.GetRooms(c.Request.Context(), hostelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rooms)
}

func (h *HostelHandler) AddRoom(c *gin.Context) {
	hostelID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hostel ID"})
		return
	}

	var room domain.HostelRoom
	if err := c.ShouldBindJSON(&room); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	room.HostelID = hostelID

	if err := h.hostelUseCase.AddRoom(c.Request.Context(), &room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, room)
}

func (h *HostelHandler) AllocateStudent(c *gin.Context) {
	var req struct {
		HostelID  uuid.UUID `json:"hostel_id" binding:"required"`
		RoomID    uuid.UUID `json:"room_id" binding:"required"`
		StudentID uuid.UUID `json:"student_id" binding:"required"`
		BedNumber string    `json:"bed_number" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.hostelUseCase.AllocateStudent(c.Request.Context(), req.HostelID, req.RoomID, req.StudentID, req.BedNumber); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student successfully assigned to hostel room"})
}

func (h *HostelHandler) GetStudentAllocation(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	alloc, err := h.hostelUseCase.GetStudentAllocation(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active hostel allocation found"})
		return
	}
	c.JSON(http.StatusOK, alloc)
}

func (h *HostelHandler) VacateStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	if err := h.hostelUseCase.VacateStudent(c.Request.Context(), studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bed vacated successfully"})
}

// GetCapacityOverview calculates real-time room capacity, occupied beds, and vacancy rates.
func (h *HostelHandler) GetCapacityOverview(c *gin.Context) {
	hostelID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid hostel ID"})
		return
	}

	rooms, err := h.hostelUseCase.GetRooms(c.Request.Context(), hostelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalCapacity := 0
	totalOccupied := 0

	type RoomSummary struct {
		RoomID       uuid.UUID `json:"room_id"`
		RoomNumber   string    `json:"room_number"`
		Capacity     int       `json:"capacity"`
		OccupiedBeds int       `json:"occupied_beds"`
		VacantBeds   int       `json:"vacant_beds"`
	}

	var roomSummaries []RoomSummary
	for _, r := range rooms {
		totalCapacity += r.Capacity
		vacant := r.Capacity - r.BedsOccupied
		if vacant < 0 {
			vacant = 0
		}
		totalOccupied += r.BedsOccupied

		roomSummaries = append(roomSummaries, RoomSummary{
			RoomID:       r.ID,
			RoomNumber:   r.RoomNumber,
			Capacity:     r.Capacity,
			OccupiedBeds: r.BedsOccupied,
			VacantBeds:   vacant,
		})
	}

	occupancyRate := 0.0
	if totalCapacity > 0 {
		occupancyRate = (float64(totalOccupied) / float64(totalCapacity)) * 100.0
	}

	c.JSON(http.StatusOK, gin.H{
		"hostel_id":      hostelID,
		"total_capacity": totalCapacity,
		"total_occupied": totalOccupied,
		"total_vacant":   totalCapacity - totalOccupied,
		"occupancy_rate": occupancyRate,
		"rooms":          roomSummaries,
	})
}
