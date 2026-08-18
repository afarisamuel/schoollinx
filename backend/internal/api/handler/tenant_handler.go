package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type TenantHandler struct {
	useCase usecase.TenantUseCase
}

func NewTenantHandler(r *gin.RouterGroup, uc usecase.TenantUseCase) {
	h := &TenantHandler{useCase: uc}

	g := r.Group("/tenants")
	{
		g.POST("", h.OnboardTenant)
		g.GET("", h.ListTenants)
		g.PATCH("/:id/status", h.UpdateStatus)
		g.POST("/:id/resend-setup", h.ResendSetupEmail)
		g.POST("/:id/admins", h.CreateTenantAdmin)
		g.PUT("/:id/billing", h.UpdateBilling)
		g.POST("/:id/impersonate", h.ImpersonateTenant)
		g.DELETE("/:id/reset", h.ResetTenantData)
		g.GET("/:id/export", h.ExportTenantData)
		g.POST("/:id/wipe", h.WipeTenantData)
		g.POST("/:id/credits", h.InjectCredits)
		g.POST("/:id/2fa", h.Toggle2FA)
		g.POST("/:id/reset-passwords", h.ForcePasswordReset)
		g.GET("/:id/subscription-history", h.GetSubscriptionHistory)
		g.PUT("/:id/payment-config", h.UpdatePaymentConfig)
	}
}

func (h *TenantHandler) UpdateBilling(c *gin.Context) {
	id := c.Param("id")
	var req usecase.BillingUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.UpdateBilling(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tenant billing configuration updated successfully"})
}

func (h *TenantHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.UpdateStatus(c.Request.Context(), id, req.IsActive); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tenant status updated successfully"})
}

func (h *TenantHandler) ResendSetupEmail(c *gin.Context) {
	id := c.Param("id")
	if err := h.useCase.ResendSetupEmail(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Setup email resent successfully"})
}

func (h *TenantHandler) OnboardTenant(c *gin.Context) {
	var req usecase.OnboardTenantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	tenant, err := h.useCase.OnboardTenant(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tenant)
}

func (h *TenantHandler) ListTenants(c *gin.Context) {
	tenants, err := h.useCase.ListTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tenants)
}

func (h *TenantHandler) CreateTenantAdmin(c *gin.Context) {
	id := c.Param("id")
	var req usecase.CreateTenantAdminReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.CreateTenantAdmin(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Tenant admin created successfully"})
}

func (h *TenantHandler) ImpersonateTenant(c *gin.Context) {
	id := c.Param("id")
	token, err := h.useCase.ImpersonateTenant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"message": "Impersonation session created successfully",
	})
}

func (h *TenantHandler) ResetTenantData(c *gin.Context) {
	id := c.Param("id")
	if err := h.useCase.ResetTenantData(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tenant schema wiped successfully. Structure will be regenerated on next migration run."})
}

func (h *TenantHandler) ExportTenantData(c *gin.Context) {
	id := c.Param("id")
	data, err := h.useCase.ExportTenantData(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Header("Content-Disposition", "attachment; filename=tenant_export.json")
	c.Data(http.StatusOK, "application/json", data)
}

func (h *TenantHandler) InjectCredits(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Amount int    `json:"amount" binding:"required"`
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	if err := h.useCase.InjectCredits(c.Request.Context(), tenantID, req.Amount, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "credits injected"})
}

func (h *TenantHandler) WipeTenantData(c *gin.Context) {
	// Implementation assumed
}

func (h *TenantHandler) Toggle2FA(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var req struct {
		Require bool `json:"require"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.Toggle2FA(c.Request.Context(), tenantID, req.Require); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle 2FA"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "2FA requirement updated"})
}

func (h *TenantHandler) ForcePasswordReset(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	if err := h.useCase.ForcePasswordReset(c.Request.Context(), tenantID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to force password reset"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "tenant passwords reset successfully"})
}

func (h *TenantHandler) GetSubscriptionHistory(c *gin.Context) {
	id := c.Param("id")
	history, err := h.useCase.GetSubscriptionHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *TenantHandler) UpdatePaymentConfig(c *gin.Context) {
	id := c.Param("id")
	var req usecase.PaymentConfigReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.UpdatePaymentConfig(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Payment configuration updated successfully"})
}
