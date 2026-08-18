package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type ScholasticLevelHandler struct {
	useCase domain.ScholasticLevelUseCase
}

func NewScholasticLevelHandler(r *gin.RouterGroup, useCase domain.ScholasticLevelUseCase) {
	h := &ScholasticLevelHandler{useCase: useCase}

	g := r.Group("/scholastic-levels")
	{
		g.POST("", h.CreateLevel)
		g.GET("", h.GetAllLevels)
		g.GET("/:id", h.GetLevelByID)
		g.PUT("/:id", h.UpdateLevel)
		g.DELETE("/:id", h.DeleteLevel)
	}
}

func (h *ScholasticLevelHandler) CreateLevel(c *gin.Context) {
	var sl domain.ScholasticLevel
	if err := c.ShouldBindJSON(&sl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateLevel(c.Request.Context(), &sl); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, sl)
}

func (h *ScholasticLevelHandler) GetAllLevels(c *gin.Context) {
	levels, err := h.useCase.GetAllLevels(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, levels)
}

func (h *ScholasticLevelHandler) GetLevelByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	level, err := h.useCase.GetLevelByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, level)
}

func (h *ScholasticLevelHandler) UpdateLevel(c *gin.Context) {
	var sl domain.ScholasticLevel
	if err := c.ShouldBindJSON(&sl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	sl.ID = id

	if err := h.useCase.UpdateLevel(c.Request.Context(), &sl); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sl)
}

func (h *ScholasticLevelHandler) DeleteLevel(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeleteLevel(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scholastic level deleted"})
}
