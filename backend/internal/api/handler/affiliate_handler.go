package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type AffiliateHandler struct {
	db *gorm.DB
}

func NewAffiliateHandler(r *gin.RouterGroup, db *gorm.DB) {
	h := &AffiliateHandler{db: db}
	r.GET("", h.ListAffiliates)
	r.POST("", h.CreateAffiliate)
	r.PUT("/:id", h.UpdateAffiliate)
	r.PATCH("/:id/toggle", h.ToggleAffiliate)
	r.DELETE("/:id", h.DeleteAffiliate)

	// Referral sub-resources
	r.GET("/:id/referrals", h.ListReferrals)
	r.POST("/:id/referrals", h.AddReferral)
	r.PATCH("/referrals/:referral_id/pay", h.MarkReferralPaid)
}

// ListAffiliates returns all affiliates with their referral counts and total commissions.
func (h *AffiliateHandler) ListAffiliates(c *gin.Context) {
	var affiliates []domain.Affiliate
	if err := h.db.Table("public.affiliates").Order("created_at desc").Find(&affiliates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch affiliates"})
		return
	}

	// Enrich with computed referral stats
	for i := range affiliates {
		type Stats struct {
			Count       int     `gorm:"column:count"`
			TotalEarned float64 `gorm:"column:total_earned"`
		}
		var stats Stats
		h.db.Table("public.affiliate_referrals").
			Select("COUNT(*) as count, COALESCE(SUM(commission_paid), 0) as total_earned").
			Where("affiliate_id = ?", affiliates[i].ID).
			Scan(&stats)
		affiliates[i].Referrals = stats.Count
		affiliates[i].TotalEarned = stats.TotalEarned
	}

	c.JSON(http.StatusOK, affiliates)
}

// CreateAffiliate creates a new affiliate.
func (h *AffiliateHandler) CreateAffiliate(c *gin.Context) {
	var req struct {
		Name           string  `json:"name" binding:"required"`
		Email          string  `json:"email" binding:"required,email"`
		Phone          string  `json:"phone"`
		CommissionRate float64 `json:"commission_rate" binding:"required,min=0,max=1"`
		Notes          string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	affiliate := domain.Affiliate{
		Name:           req.Name,
		Email:          req.Email,
		Phone:          req.Phone,
		CommissionRate: req.CommissionRate,
		Notes:          req.Notes,
		IsActive:       true,
	}

	if err := h.db.Table("public.affiliates").Create(&affiliate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create affiliate"})
		return
	}

	c.JSON(http.StatusCreated, affiliate)
}

// UpdateAffiliate updates an existing affiliate.
func (h *AffiliateHandler) UpdateAffiliate(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name           string  `json:"name" binding:"required"`
		Email          string  `json:"email" binding:"required,email"`
		Phone          string  `json:"phone"`
		CommissionRate float64 `json:"commission_rate" binding:"required,min=0,max=1"`
		Notes          string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Table("public.affiliates").Where("id = ?", id).Updates(map[string]interface{}{
		"name":            req.Name,
		"email":           req.Email,
		"phone":           req.Phone,
		"commission_rate": req.CommissionRate,
		"notes":           req.Notes,
		"updated_at":      time.Now(),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update affiliate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Affiliate updated successfully"})
}

// ToggleAffiliate activates or deactivates an affiliate.
func (h *AffiliateHandler) ToggleAffiliate(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.db.Table("public.affiliates").Where("id = ?", id).Update("is_active", req.IsActive).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle affiliate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Affiliate status updated"})
}

// DeleteAffiliate soft-deletes an affiliate.
func (h *AffiliateHandler) DeleteAffiliate(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Table("public.affiliates").Where("id = ?", id).Delete(&domain.Affiliate{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete affiliate"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Affiliate deleted"})
}

// ListReferrals returns all referrals for a given affiliate with tenant info.
func (h *AffiliateHandler) ListReferrals(c *gin.Context) {
	id := c.Param("id")

	type ReferralRow struct {
		ID             string     `json:"id"`
		TenantID       string     `json:"tenant_id"`
		TenantName     string     `json:"tenant_name"`
		TenantSubdomain string    `json:"tenant_subdomain"`
		TenantPlan     string     `json:"tenant_plan"`
		CommissionPaid float64    `json:"commission_paid"`
		PaidAt         *time.Time `json:"paid_at"`
		CreatedAt      time.Time  `json:"created_at"`
	}

	var rows []ReferralRow
	h.db.Table("public.affiliate_referrals ar").
		Select(`ar.id, ar.tenant_id, t.name as tenant_name, t.subdomain as tenant_subdomain, 
		        t.subscription_plan as tenant_plan, ar.commission_paid, ar.paid_at, ar.created_at`).
		Joins("JOIN public.tenants t ON t.id = ar.tenant_id").
		Where("ar.affiliate_id = ?", id).
		Order("ar.created_at desc").
		Scan(&rows)

	if rows == nil {
		rows = []ReferralRow{}
	}

	c.JSON(http.StatusOK, rows)
}

// AddReferral links a tenant to an affiliate.
func (h *AffiliateHandler) AddReferral(c *gin.Context) {
	affiliateIDStr := c.Param("id")
	affiliateID, err := uuid.Parse(affiliateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid affiliate ID"})
		return
	}

	var req struct {
		TenantID string `json:"tenant_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	// Get affiliate to compute commission
	var affiliate domain.Affiliate
	if err := h.db.Table("public.affiliates").Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Affiliate not found"})
		return
	}

	// Get tenant to compute commission value
	var tenant domain.Tenant
	h.db.Table("public.tenants").Where("id = ?", tenantID).First(&tenant)

	monthly := 0.0
	if tenant.FixedPriceOverride > 0 {
		monthly = tenant.FixedPriceOverride
	} else {
		monthly = (tenant.PerStudentPerTermRate * 100) / 4
	}

	referral := domain.AffiliateReferral{
		AffiliateID:    affiliateID,
		TenantID:       tenantID,
		CommissionPaid: monthly * affiliate.CommissionRate,
	}

	if err := h.db.Table("public.affiliate_referrals").Create(&referral).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add referral — tenant may already be assigned"})
		return
	}

	c.JSON(http.StatusCreated, referral)
}

// MarkReferralPaid marks a referral commission as paid.
func (h *AffiliateHandler) MarkReferralPaid(c *gin.Context) {
	referralID := c.Param("referral_id")
	now := time.Now()
	if err := h.db.Table("public.affiliate_referrals").Where("id = ?", referralID).Updates(map[string]interface{}{
		"paid_at": &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as paid"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Commission marked as paid"})
}
