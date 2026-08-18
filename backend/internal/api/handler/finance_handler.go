package handler

import (
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	db *gorm.DB
}

func NewFinanceHandler(r *gin.RouterGroup, db *gorm.DB) {
	h := &FinanceHandler{db: db}
	r.GET("/mrr", h.GetMRR)
	r.GET("/churn-risk", h.GetChurnRisk)
	r.GET("/overview", h.GetOverview)
	r.GET("/revenue-by-plan", h.GetRevenueByPlan)
	r.GET("/tenant-health", h.GetTenantHealth)
}

// GetOverview returns a comprehensive financial overview.
func (h *FinanceHandler) GetOverview(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	var mrr, arr float64
	activeTenants := 0
	suspendedTenants := 0
	totalSMSCredits := 0
	totalStorageGB := 0.0
	trialCount := 0

	now := time.Now()
	thirtyDaysAgo := now.Add(-30 * 24 * time.Hour)

	for _, t := range tenants {
		if t.IsActive {
			activeTenants++
		} else {
			suspendedTenants++
		}

		if t.TrialEndsAt != nil && t.TrialEndsAt.After(now) {
			trialCount++
		}

		totalSMSCredits += t.SMSCredits
		totalStorageGB += float64(t.StorageUsedMB) / 1024.0

		if !t.IsActive {
			continue
		}

		monthly := 0.0
		if t.FixedPriceOverride > 0 {
			monthly = t.FixedPriceOverride
		} else {
			monthly = (t.PerStudentPerTermRate * 100) / 4
		}
		if t.DiscountPercentage > 0 {
			monthly = monthly * (1 - (t.DiscountPercentage / 100))
		}
		mrr += monthly
	}
	arr = mrr * 12

	// Count newly added tenants this month
	newThisMonth := 0
	for _, t := range tenants {
		if t.CreatedAt.After(thirtyDaysAgo) {
			newThisMonth++
		}
	}

	// Count DPA compliance
	dpaSigned := 0
	for _, t := range tenants {
		if t.DPASignedAt != nil {
			dpaSigned++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"mrr":               mrr,
		"arr":               arr,
		"total_tenants":     len(tenants),
		"active_tenants":    activeTenants,
		"suspended_tenants": suspendedTenants,
		"trial_tenants":     trialCount,
		"new_this_month":    newThisMonth,
		"total_sms_credits": totalSMSCredits,
		"storage_used_gb":   totalStorageGB,
		"dpa_signed":        dpaSigned,
		"dpa_compliance_pct": func() float64 {
			if len(tenants) == 0 {
				return 0
			}
			return float64(dpaSigned) / float64(len(tenants)) * 100
		}(),
	})
}

// GetRevenueByPlan breaks down tenants & revenue by subscription plan.
func (h *FinanceHandler) GetRevenueByPlan(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	type PlanData struct {
		Plan    string  `json:"plan"`
		Count   int     `json:"count"`
		Revenue float64 `json:"revenue"`
	}

	planMap := map[string]*PlanData{}

	for _, t := range tenants {
		plan := t.SubscriptionPlan
		if plan == "" {
			plan = "BASIC"
		}

		if _, ok := planMap[plan]; !ok {
			planMap[plan] = &PlanData{Plan: plan}
		}

		planMap[plan].Count++

		monthly := 0.0
		if t.FixedPriceOverride > 0 {
			monthly = t.FixedPriceOverride
		} else {
			monthly = (t.PerStudentPerTermRate * 100) / 4
		}
		if t.DiscountPercentage > 0 {
			monthly = monthly * (1 - (t.DiscountPercentage / 100))
		}
		planMap[plan].Revenue += monthly
	}

	result := make([]*PlanData, 0, len(planMap))
	for _, v := range planMap {
		result = append(result, v)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Revenue > result[j].Revenue
	})

	c.JSON(http.StatusOK, result)
}

// GetTenantHealth returns per-tenant billing health stats.
func (h *FinanceHandler) GetTenantHealth(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	type TenantHealth struct {
		ID               string  `json:"id"`
		Name             string  `json:"name"`
		Subdomain        string  `json:"subdomain"`
		Plan             string  `json:"plan"`
		Monthly          float64 `json:"monthly"`
		SMSCredits       int     `json:"sms_credits"`
		StorageUsedGB    float64 `json:"storage_used_gb"`
		StorageLimitGB   int     `json:"storage_limit_gb"`
		StorageUsedPct   float64 `json:"storage_used_pct"`
		DPASigned        bool    `json:"dpa_signed"`
		Require2FA       bool    `json:"require_2fa"`
		Discount         float64 `json:"discount"`
		BillingDue       *time.Time `json:"billing_due"`
	}

	result := make([]TenantHealth, 0, len(tenants))
	for _, t := range tenants {
		monthly := 0.0
		if t.FixedPriceOverride > 0 {
			monthly = t.FixedPriceOverride
		} else {
			monthly = (t.PerStudentPerTermRate * 100) / 4
		}
		if t.DiscountPercentage > 0 {
			monthly = monthly * (1 - (t.DiscountPercentage / 100))
		}

		storagePct := 0.0
		if t.StorageLimitGB > 0 {
			storagePct = (float64(t.StorageUsedMB) / 1024.0) / float64(t.StorageLimitGB) * 100
		}

		plan := t.SubscriptionPlan
		if plan == "" {
			plan = "BASIC"
		}

		result = append(result, TenantHealth{
			ID:             t.ID.String(),
			Name:           t.Name,
			Subdomain:      t.Subdomain,
			Plan:           plan,
			Monthly:        monthly,
			SMSCredits:     t.SMSCredits,
			StorageUsedGB:  float64(t.StorageUsedMB) / 1024.0,
			StorageLimitGB: t.StorageLimitGB,
			StorageUsedPct: storagePct,
			DPASigned:      t.DPASignedAt != nil,
			Require2FA:     t.Require2FA,
			Discount:       t.DiscountPercentage,
			BillingDue:     t.BillingDueDate,
		})
	}

	// Sort by monthly revenue descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].Monthly > result[j].Monthly
	})

	c.JSON(http.StatusOK, result)
}

func (h *FinanceHandler) GetMRR(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	var mrr float64
	var arr float64

	for _, tenant := range tenants {
		if !tenant.IsActive {
			continue
		}
		monthly := 0.0
		if tenant.FixedPriceOverride > 0 {
			monthly = tenant.FixedPriceOverride
		} else {
			monthly = (tenant.PerStudentPerTermRate * 100) / 4
		}

		if tenant.DiscountPercentage > 0 {
			monthly = monthly * (1 - (tenant.DiscountPercentage / 100))
		}

		mrr += monthly
	}

	arr = mrr * 12

	c.JSON(http.StatusOK, gin.H{
		"mrr": mrr,
		"arr": arr,
	})
}

func (h *FinanceHandler) GetChurnRisk(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Where("is_active = ?", true).Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	var atRisk []map[string]interface{}

	threshold := time.Now().Add(-30 * 24 * time.Hour) // 30 days ago

	for _, tenant := range tenants {
		if tenant.SchemaName == "" || tenant.SchemaName == "public" {
			continue
		}

		var lastLogin time.Time
		var newestUser domain.User
		if err := h.db.Table(tenant.SchemaName + ".users").Order("updated_at desc").First(&newestUser).Error; err == nil {
			lastLogin = newestUser.UpdatedAt
		}

		if lastLogin.Before(threshold) || lastLogin.IsZero() {
			atRisk = append(atRisk, map[string]interface{}{
				"tenant_id":     tenant.ID,
				"name":          tenant.Name,
				"subdomain":     tenant.Subdomain,
				"last_activity": lastLogin,
				"risk_level":    "HIGH",
			})
		}
	}

	c.JSON(http.StatusOK, atRisk)
}
