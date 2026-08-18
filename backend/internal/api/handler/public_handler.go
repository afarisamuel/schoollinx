package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type PublicHandler struct {
	tenantUseCase usecase.TenantUseCase
}

func NewPublicHandler(r *gin.RouterGroup, tenantUseCase usecase.TenantUseCase) {
	h := &PublicHandler{tenantUseCase: tenantUseCase}

	g := r.Group("/tenants")
	{
		g.POST("/register", h.RegisterTenant)
	}
}

func (h *PublicHandler) RegisterTenant(c *gin.Context) {
	var req usecase.OnboardTenantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	tenant, err := h.tenantUseCase.OnboardTenant(c.Request.Context(), req)
	if err != nil {
		// Log the error but return a generic message if needed, or specific if safe
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Tenant registered successfully. Please check your email for the setup link.",
		"tenant":  tenant,
	})
}
