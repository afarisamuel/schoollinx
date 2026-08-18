package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type ProcurementHandler struct {
	uc *usecase.ProcurementUseCase
}

func NewProcurementHandler(rg *gin.RouterGroup, uc *usecase.ProcurementUseCase) *ProcurementHandler {
	h := &ProcurementHandler{uc: uc}

	g := rg.Group("/procurement")
	{
		g.POST("/suppliers", h.CreateSupplier)
		g.GET("/suppliers", h.ListSuppliers)

		g.POST("/orders", h.CreatePO)
		g.GET("/orders", h.ListPOs)
		g.GET("/orders/:id", h.GetPO)
		g.POST("/orders/:id/approve", h.ApprovePO)
		g.POST("/orders/:id/receive", h.ReceivePO)
		g.POST("/orders/:id/cancel", h.CancelPO)
	}

	return h
}

func (h *ProcurementHandler) CreateSupplier(c *gin.Context) {
	var req domain.Supplier
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.AddSupplier(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ProcurementHandler) ListSuppliers(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	suppliers, err := h.uc.ListSuppliers(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, suppliers)
}

func (h *ProcurementHandler) CreatePO(c *gin.Context) {
	var req domain.PurchaseOrder
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreatePO(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ProcurementHandler) ListPOs(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	pos, err := h.uc.ListPOs(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pos)
}

func (h *ProcurementHandler) GetPO(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}
	po, err := h.uc.GetPO(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, po)
}

func (h *ProcurementHandler) ApprovePO(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	if err := h.uc.ApprovePO(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PO approved"})
}

func (h *ProcurementHandler) ReceivePO(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	if err := h.uc.ReceivePO(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PO received"})
}

func (h *ProcurementHandler) CancelPO(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	if err := h.uc.CancelPO(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PO cancelled"})
}
