package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type HouseHandler struct {
	useCase domain.HouseUseCase
}

func NewHouseHandler(r *gin.RouterGroup, uc domain.HouseUseCase) *HouseHandler {
	handler := &HouseHandler{useCase: uc}

	houses := r.Group("/houses")
	{
		houses.GET("/", handler.GetAllHouses)
		houses.POST("/", handler.CreateHouse)
		houses.GET("/leaderboard", handler.GetLeaderboard)

		houses.PUT("/:id", handler.UpdateHouse)
		houses.DELETE("/:id", handler.DeleteHouse)

		houses.POST("/assign", handler.AssignStudent)
		houses.GET("/student/:studentID", handler.GetStudentHouse)
	}

	return handler
}

func (h *HouseHandler) GetAllHouses(c *gin.Context) {
	houses, err := h.useCase.GetAllHouses(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, houses)
}

func (h *HouseHandler) CreateHouse(c *gin.Context) {
	var house domain.House
	if err := c.ShouldBindJSON(&house); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.CreateHouse(c.Request.Context(), &house); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, house)
}

func (h *HouseHandler) UpdateHouse(c *gin.Context) {
	var house domain.House
	if err := c.ShouldBindJSON(&house); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.UpdateHouse(c.Request.Context(), &house); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, house)
}

func (h *HouseHandler) DeleteHouse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	if err := h.useCase.DeleteHouse(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HouseHandler) GetLeaderboard(c *gin.Context) {
	houses, err := h.useCase.GetLeaderboard(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, houses)
}

type assignReq struct {
	StudentID uuid.UUID `json:"student_id"`
	HouseID   uuid.UUID `json:"house_id"`
}

func (h *HouseHandler) AssignStudent(c *gin.Context) {
	var req assignReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.AssignStudentToHouse(c.Request.Context(), req.StudentID, req.HouseID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

func (h *HouseHandler) GetStudentHouse(c *gin.Context) {
	idStr := c.Param("studentID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	house, err := h.useCase.GetStudentHouse(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, house)
}
