package handler

import (
	"fmt"
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
	r.GET("/billing-alerts", h.GetBillingAlerts)
	r.GET("/storage-usage", h.GetStorageUsage)
}

func (h *FinanceHandler) calculateMonthlyRevenue(t domain.Tenant) float64 {
	if t.FixedPriceOverride > 0 {
		return t.FixedPriceOverride
	}

	var studentCount int64
	if t.SchemaName != "" && t.SchemaName != "public" {
		// Attempt to count active students; if table doesn't exist or errors, it defaults to 0
		h.db.Table(t.SchemaName + ".students").Count(&studentCount)
	}

	monthly := (t.PerStudentPerTermRate * float64(studentCount)) / 4
	if t.DiscountPercentage > 0 {
		monthly = monthly * (1 - (t.DiscountPercentage / 100))
	}
	return monthly
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

		if !t.IsActive {
			continue
		}

		mrr += h.calculateMonthlyRevenue(t)
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

		planMap[plan].Revenue += h.calculateMonthlyRevenue(t)
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
		ID             string     `json:"id"`
		Name           string     `json:"name"`
		Subdomain      string     `json:"subdomain"`
		Plan           string     `json:"plan"`
		Monthly        float64    `json:"monthly"`
		SMSCredits     int        `json:"sms_credits"`
		StorageUsedGB  float64    `json:"storage_used_gb"`
		StorageLimitGB int        `json:"storage_limit_gb"`
		StorageUsedPct float64    `json:"storage_used_pct"`
		DPASigned      bool       `json:"dpa_signed"`
		Require2FA     bool       `json:"require_2fa"`
		Discount       float64    `json:"discount"`
		BillingDue     *time.Time `json:"billing_due"`
	}

	result := make([]TenantHealth, 0, len(tenants))
	for _, t := range tenants {
		monthly := h.calculateMonthlyRevenue(t)

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

		mrr += h.calculateMonthlyRevenue(tenant)
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

// GetBillingAlerts returns overdue payments, expiring trials, low SMS credits, and high storage warnings.
func (h *FinanceHandler) GetBillingAlerts(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	now := time.Now()
	sevenDaysFromNow := now.Add(7 * 24 * time.Hour)

	type AlertItem struct {
		TenantID    string      `json:"tenant_id"`
		Name        string      `json:"name"`
		Subdomain   string      `json:"subdomain"`
		AlertType   string      `json:"alert_type"` // OVERDUE, TRIAL_EXPIRING, LOW_SMS, HIGH_STORAGE
		Severity    string      `json:"severity"`   // CRITICAL, WARNING, INFO
		Description string      `json:"description"`
		DueDate     *time.Time  `json:"due_date,omitempty"`
		Value       interface{} `json:"value,omitempty"`
	}

	var alerts []AlertItem

	for _, t := range tenants {
		if !t.IsActive {
			continue
		}

		// Overdue billing check
		if t.BillingDueDate != nil && t.BillingDueDate.Before(now) {
			daysOverdue := int(now.Sub(*t.BillingDueDate).Hours() / 24)
			alerts = append(alerts, AlertItem{
				TenantID:    t.ID.String(),
				Name:        t.Name,
				Subdomain:   t.Subdomain,
				AlertType:   "OVERDUE",
				Severity:    "CRITICAL",
				Description: fmt.Sprintf("Subscription billing is %d day(s) overdue", daysOverdue),
				DueDate:     t.BillingDueDate,
				Value:       daysOverdue,
			})
		}

		// Expiring trial check
		if t.TrialEndsAt != nil && t.TrialEndsAt.After(now) && t.TrialEndsAt.Before(sevenDaysFromNow) {
			daysRemaining := int(t.TrialEndsAt.Sub(now).Hours() / 24)
			alerts = append(alerts, AlertItem{
				TenantID:    t.ID.String(),
				Name:        t.Name,
				Subdomain:   t.Subdomain,
				AlertType:   "TRIAL_EXPIRING",
				Severity:    "WARNING",
				Description: fmt.Sprintf("Trial period ends in %d day(s)", daysRemaining),
				DueDate:     t.TrialEndsAt,
				Value:       daysRemaining,
			})
		}

		// Low SMS credits (< 50)
		if t.SMSCredits < 50 {
			alerts = append(alerts, AlertItem{
				TenantID:    t.ID.String(),
				Name:        t.Name,
				Subdomain:   t.Subdomain,
				AlertType:   "LOW_SMS",
				Severity:    "WARNING",
				Description: fmt.Sprintf("SMS credit balance is critically low (%d credits remaining)", t.SMSCredits),
				Value:       t.SMSCredits,
			})
		}

		// High Storage (> 80% used)
		if t.StorageLimitGB > 0 {
			usedGB := float64(t.StorageUsedMB) / 1024.0
			pct := (usedGB / float64(t.StorageLimitGB)) * 100
			if pct >= 80 {
				alerts = append(alerts, AlertItem{
					TenantID:    t.ID.String(),
					Name:        t.Name,
					Subdomain:   t.Subdomain,
					AlertType:   "HIGH_STORAGE",
					Severity:    "WARNING",
					Description: fmt.Sprintf("Storage is at %.1f%% of quota (%.1f GB / %d GB)", pct, usedGB, t.StorageLimitGB),
					Value:       pct,
				})
			}
		}
	}

	c.JSON(http.StatusOK, alerts)
}

// GetStorageUsage returns detailed storage consumption across all tenants.
func (h *FinanceHandler) GetStorageUsage(c *gin.Context) {
	var tenants []domain.Tenant
	if err := h.db.Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}

	type TenantStorage struct {
		ID             string  `json:"id"`
		Name           string  `json:"name"`
		Subdomain      string  `json:"subdomain"`
		Plan           string  `json:"plan"`
		StorageUsedMB  int     `json:"storage_used_mb"`
		StorageUsedGB  float64 `json:"storage_used_gb"`
		StorageLimitGB int     `json:"storage_limit_gb"`
		UsagePct       float64 `json:"usage_pct"`
		IsWarning      bool    `json:"is_warning"`
	}

	var results []TenantStorage
	var totalUsedMB int
	var totalLimitGB int

	for _, t := range tenants {
		usedGB := float64(t.StorageUsedMB) / 1024.0
		limitGB := t.StorageLimitGB
		if limitGB == 0 {
			limitGB = 5
		}
		pct := (usedGB / float64(limitGB)) * 100
		if pct > 100 {
			pct = 100
		}

		totalUsedMB += t.StorageUsedMB
		totalLimitGB += limitGB

		results = append(results, TenantStorage{
			ID:             t.ID.String(),
			Name:           t.Name,
			Subdomain:      t.Subdomain,
			Plan:           t.SubscriptionPlan,
			StorageUsedMB:  t.StorageUsedMB,
			StorageUsedGB:  usedGB,
			StorageLimitGB: limitGB,
			UsagePct:       pct,
			IsWarning:      pct >= 80,
		})
	}

	// Sort by storage used desc
	sort.Slice(results, func(i, j int) bool {
		return results[i].StorageUsedMB > results[j].StorageUsedMB
	})

	c.JSON(http.StatusOK, gin.H{
		"tenants":        results,
		"total_used_gb":  float64(totalUsedMB) / 1024.0,
		"total_limit_gb": totalLimitGB,
		"platform_pct":   (float64(totalUsedMB) / (float64(totalLimitGB) * 1024.0)) * 100,
	})
}
