package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type InventoryHandler struct {
	uc *usecase.StockUseCase
}

func NewInventoryHandler(rg *gin.RouterGroup, uc *usecase.StockUseCase) *InventoryHandler {
	h := &InventoryHandler{uc: uc}

	g := rg.Group("/inventory")
	{
		g.POST("/items", h.CreateItem)
		g.GET("/items", h.ListItems)
		g.GET("/items/low-stock", h.GetLowStock)
		g.GET("/items/:id/movements", h.GetMovements)

		g.POST("/movements/in", h.RecordIn)
		g.POST("/movements/out", h.RecordOut)
		g.POST("/movements/adjust", h.Adjust)
	}

	return h
}

func (h *InventoryHandler) CreateItem(c *gin.Context) {
	var req domain.StockItem
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.AddItem(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *InventoryHandler) ListItems(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	items, err := h.uc.ListItems(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *InventoryHandler) GetLowStock(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	items, err := h.uc.GetLowStock(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *InventoryHandler) GetMovements(c *gin.Context) {
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	movements, err := h.uc.GetMovements(c.Request.Context(), itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, movements)
}

func (h *InventoryHandler) RecordIn(c *gin.Context) {
	var req domain.StockMovement
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.RecordIn(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *InventoryHandler) RecordOut(c *gin.Context) {
	var req domain.StockMovement
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.RecordOut(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *InventoryHandler) Adjust(c *gin.Context) {
	var req domain.StockMovement
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.Adjust(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "stock adjusted"})
}
