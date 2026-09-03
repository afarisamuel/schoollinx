package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
	"gorm.io/gorm"
)

type TenantHandler struct {
	useCase usecase.TenantUseCase
	db      *gorm.DB
}

func NewTenantHandler(r *gin.RouterGroup, uc usecase.TenantUseCase, db *gorm.DB) {
	h := &TenantHandler{useCase: uc, db: db}

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
		// Feature Flags
		g.GET("/:id/feature-flags", h.GetFeatureFlags)
		g.PATCH("/:id/feature-flags", h.UpdateFeatureFlags)
		// Tenant Notes (internal CRM log)
		g.GET("/:id/notes", h.ListTenantNotes)
		g.POST("/:id/notes", h.AddTenantNote)
		// Onboarding Checklist progress
		g.GET("/:id/onboarding-status", h.GetOnboardingStatus)
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

// GetFeatureFlags retrieves the feature flags JSON for a tenant.
func (h *TenantHandler) GetFeatureFlags(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var tenant domain.Tenant
	if err := h.db.Select("id", "name", "subdomain", "feature_flags").Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	var flags map[string]bool
	if tenant.FeatureFlags != "" {
		_ = json.Unmarshal([]byte(tenant.FeatureFlags), &flags)
	}
	if flags == nil {
		flags = make(map[string]bool)
	}

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":     tenant.ID,
		"feature_flags": flags,
	})
}

// UpdateFeatureFlags updates individual feature flags for a tenant.
func (h *TenantHandler) UpdateFeatureFlags(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var req struct {
		Flags map[string]bool `json:"flags" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload: flags map required"})
		return
	}

	var tenant domain.Tenant
	if err := h.db.Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	existingFlags := make(map[string]bool)
	if tenant.FeatureFlags != "" {
		_ = json.Unmarshal([]byte(tenant.FeatureFlags), &existingFlags)
	}

	// Merge incoming flags
	for k, v := range req.Flags {
		existingFlags[k] = v
	}

	rawBytes, err := json.Marshal(existingFlags)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode flags"})
		return
	}

	if err := h.db.Model(&domain.Tenant{}).Where("id = ?", tenantID).Update("feature_flags", string(rawBytes)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save feature flags"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "feature flags updated",
		"feature_flags": existingFlags,
	})
}

// ListTenantNotes returns the CRM internal notes for a tenant.
func (h *TenantHandler) ListTenantNotes(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var notes []domain.TenantNote
	if err := h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Find(&notes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch tenant notes"})
		return
	}

	c.JSON(http.StatusOK, notes)
}

// AddTenantNote records an internal CRM note for a tenant.
func (h *TenantHandler) AddTenantNote(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var req struct {
		Category string `json:"category"`
		Content  string `json:"content" binding:"required"`
		Author   string `json:"author"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	if req.Category == "" {
		req.Category = "GENERAL"
	}
	if req.Author == "" {
		if authEmail, exists := c.Get("user_email"); exists {
			req.Author = fmt.Sprintf("%v", authEmail)
		} else {
			req.Author = "SuperAdmin"
		}
	}

	note := domain.TenantNote{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Author:    req.Author,
		Category:  req.Category,
		Content:   req.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.db.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record tenant note"})
		return
	}

	c.JSON(http.StatusCreated, note)
}

// GetOnboardingStatus calculates the setup completion status for a tenant schema.
func (h *TenantHandler) GetOnboardingStatus(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id"})
		return
	}

	var tenant domain.Tenant
	if err := h.db.Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	var hasAdmin bool
	var classCount int64
	var studentCount int64
	var guardianCount int64
	var periodCount int64

	if tenant.SchemaName != "" && tenant.SchemaName != "public" {
		var adminCount int64
		_ = h.db.Table(tenant.SchemaName + ".users").Where("role = ?", domain.RoleAdmin).Count(&adminCount).Error
		hasAdmin = adminCount > 0

		_ = h.db.Table(tenant.SchemaName + ".classes").Count(&classCount).Error
		_ = h.db.Table(tenant.SchemaName + ".students").Count(&studentCount).Error
		_ = h.db.Table(tenant.SchemaName + ".guardians").Count(&guardianCount).Error
		_ = h.db.Table(tenant.SchemaName + ".academic_periods").Count(&periodCount).Error
	}

	hasPaystack := tenant.PaystackPublicKey != "" || tenant.PaystackSubaccountCode != ""
	hasSMS := tenant.SMSSenderID != "" || tenant.SMSCredits > 0
	hasAcademicPeriod := periodCount > 0

	// Calculate score
	stepsTotal := 6
	stepsCompleted := 0
	if hasAdmin {
		stepsCompleted++
	}
	if classCount > 0 {
		stepsCompleted++
	}
	if studentCount > 0 {
		stepsCompleted++
	}
	if hasAcademicPeriod {
		stepsCompleted++
	}
	if hasPaystack {
		stepsCompleted++
	}
	if hasSMS {
		stepsCompleted++
	}

	progressPct := int((float64(stepsCompleted) / float64(stepsTotal)) * 100)

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":            tenant.ID,
		"name":                 tenant.Name,
		"subdomain":            tenant.Subdomain,
		"has_admin":            hasAdmin,
		"class_count":          classCount,
		"student_count":        studentCount,
		"guardian_count":       guardianCount,
		"has_academic_period":  hasAcademicPeriod,
		"has_paystack":         hasPaystack,
		"has_sms":              hasSMS,
		"sms_credits":          tenant.SMSCredits,
		"sms_sender_id_status": tenant.SMSSenderIDStatus,
		"steps_completed":      stepsCompleted,
		"steps_total":          stepsTotal,
		"progress_percentage":  progressPct,
		"is_ready_for_launch":  stepsCompleted >= 4,
	})
}
