package handler

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	db          *gorm.DB
	paystackSvc domain.PaystackService
}

func NewFinanceHandler(r *gin.RouterGroup, db *gorm.DB, paystackSvc ...domain.PaystackService) {
	h := &FinanceHandler{db: db}
	if len(paystackSvc) > 0 {
		h.paystackSvc = paystackSvc[0]
	}

	// Auto-migrate reconciliation records table
	_ = db.AutoMigrate(&domain.PlatformPaymentReconciliation{})

	r.GET("/mrr", h.GetMRR)
	r.GET("/churn-risk", h.GetChurnRisk)
	r.GET("/overview", h.GetOverview)
	r.GET("/revenue-by-plan", h.GetRevenueByPlan)
	r.GET("/tenant-health", h.GetTenantHealth)
	r.GET("/billing-alerts", h.GetBillingAlerts)
	r.GET("/storage-usage", h.GetStorageUsage)

	// Centralized Platform Financial Transactions & Settlement Ledger
	r.GET("/transactions", h.GetPlatformTransactions)
	r.POST("/transactions/:reference/reconcile", h.ReconcileTransaction)
	r.POST("/transactions/:reference/refund", h.RefundTransaction)
	r.POST("/transactions/:reference/verify", h.VerifyTransaction)
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

// ── Centralized Platform Financial Transactions & Settlement Ledger ────────────

func (h *FinanceHandler) GetPlatformTransactions(c *gin.Context) {
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	tenantFilter := c.Query("tenant_id")
	categoryFilter := c.Query("category")
	routingFilter := c.Query("routing")
	statusFilter := c.Query("status")
	misroutedOnly := c.Query("misrouted_only") == "true" || c.Query("misrouted_only") == "1"

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "25"))
	if pageSize < 1 || pageSize > 200 {
		pageSize = 25
	}

	// 1. Fetch all tenants for fast in-memory map lookup
	var tenants []domain.Tenant
	_ = h.db.Find(&tenants).Error
	tenantMap := make(map[string]domain.Tenant, len(tenants))
	for _, t := range tenants {
		tenantMap[t.ID.String()] = t
	}

	// 2. Fetch all reconciliations
	var reconciliations []domain.PlatformPaymentReconciliation
	_ = h.db.Find(&reconciliations).Error
	reconcileMap := make(map[string]domain.PlatformPaymentReconciliation, len(reconciliations))
	for _, r := range reconciliations {
		reconcileMap[r.Reference] = r
	}

	// 3. Collect from all 3 payment sources:
	var records []domain.PlatformPaymentRecord

	// Source A: payment_transactions (Student fees, invoices, wallet top-ups)
	var paymentTxs []domain.PaymentTransaction
	_ = h.db.Order("created_at DESC").Find(&paymentTxs).Error
	for _, pt := range paymentTxs {
		t := tenantMap[pt.TenantID]
		tenantName := t.Name
		if tenantName == "" {
			tenantName = "Unknown School"
		}

		category := "SCHOOL_FEES"
		if strings.HasPrefix(pt.Reference, "TOPUP-") || (pt.FiscalRecordID == nil && pt.StudentID != nil) {
			category = "WALLET_TOPUP"
		}

		routingType := "MAIN_ACCOUNT"
		settlementDest := "Platform Main Account Vault"
		if t.PaystackSubaccountCode != "" {
			routingType = "SUBACCOUNT"
			settlementDest = fmt.Sprintf("%s (%s)", t.PaystackBankName, t.PaystackAccountNumber)
			if settlementDest == " ()" {
				settlementDest = fmt.Sprintf("Subaccount: %s", t.PaystackSubaccountCode)
			}
		} else if t.PaystackPublicKey != "" {
			routingType = "DIRECT_KEYS"
			settlementDest = "School Direct API Keys"
		}

		isMisrouted := false
		if routingType == "MAIN_ACCOUNT" && (category == "SCHOOL_FEES" || category == "WALLET_TOPUP") {
			isMisrouted = true
		}

		status := string(pt.Status)
		if status == "" {
			status = "PENDING"
		}

		rec := domain.PlatformPaymentRecord{
			ID:                    pt.ID.String(),
			Reference:             pt.Reference,
			TenantID:              pt.TenantID,
			TenantName:            tenantName,
			TenantSubdomain:       t.Subdomain,
			PayerEmail:            "parent@" + t.Subdomain + ".schoollinx.com",
			PayerName:             "Parent / Guardian",
			PayerRole:             "Payer",
			Category:              category,
			RoutingType:           routingType,
			SubaccountCode:        t.PaystackSubaccountCode,
			SettlementDestination: settlementDest,
			Amount:                pt.Amount,
			Currency:              "GHS",
			Status:                status,
			Provider:              pt.Provider,
			IsMisrouted:           isMisrouted,
			CreatedAt:             pt.CreatedAt,
			UpdatedAt:             pt.UpdatedAt,
		}

		if pt.StudentID != nil {
			sid := pt.StudentID.String()
			rec.StudentID = &sid
			rec.StudentName = "Scholar #" + sid[:8]
		}

		// Apply reconciliation overlay if exists
		if recon, exists := reconcileMap[pt.Reference]; exists {
			rec.Reconciled = recon.IsReconciled
			rec.ReconciliationNote = recon.AdminNotes
			rec.RemittanceRef = recon.RemittanceRef
			tRecon := recon.ReconciledAt
			rec.ReconciledAt = &tRecon
			rec.ReconciledBy = recon.ReconciledBy
			rec.RefundReason = recon.RefundReason
			rec.RefundedAt = recon.RefundedAt
			rec.RefundedBy = recon.RefundedBy
			if recon.ReconciliationType == "REFUNDED_TO_PAYER" {
				rec.Status = "REFUNDED"
			}
		}

		records = append(records, rec)
	}

	// Source B: tenant_subscription_payments (SaaS Platform Subscriptions)
	var subPayments []domain.TenantSubscriptionPayment
	_ = h.db.Order("created_at DESC").Find(&subPayments).Error
	for _, sp := range subPayments {
		t := tenantMap[sp.TenantID.String()]
		tenantName := t.Name
		if tenantName == "" {
			tenantName = "Unknown School"
		}

		status := sp.Status
		if status == "" {
			status = "PENDING"
		}

		rec := domain.PlatformPaymentRecord{
			ID:                    sp.ID.String(),
			Reference:             sp.Reference,
			TenantID:              sp.TenantID.String(),
			TenantName:            tenantName,
			TenantSubdomain:       t.Subdomain,
			PayerEmail:            sp.PayerEmail,
			PayerName:             "School Administrator",
			PayerRole:             "Administrator",
			Category:              "TENANT_SUBSCRIPTION",
			RoutingType:           "MAIN_ACCOUNT",
			SettlementDestination: "Platform SaaS Revenue Vault",
			Amount:                sp.Amount,
			Currency:              "GHS",
			Status:                status,
			Provider:              sp.Provider,
			IsMisrouted:           false,
			CreatedAt:             sp.CreatedAt,
			UpdatedAt:             sp.UpdatedAt,
		}

		if recon, exists := reconcileMap[sp.Reference]; exists {
			rec.Reconciled = recon.IsReconciled
			rec.ReconciliationNote = recon.AdminNotes
			rec.RemittanceRef = recon.RemittanceRef
			tRecon := recon.ReconciledAt
			rec.ReconciledAt = &tRecon
			rec.ReconciledBy = recon.ReconciledBy
			rec.RefundReason = recon.RefundReason
			rec.RefundedAt = recon.RefundedAt
			rec.RefundedBy = recon.RefundedBy
			if recon.ReconciliationType == "REFUNDED_TO_PAYER" {
				rec.Status = "REFUNDED"
			}
		}

		records = append(records, rec)
	}

	// Source C: sms_top_up_payments (SMS Credit topups)
	var smsPayments []domain.SMSTopUpPayment
	_ = h.db.Order("created_at DESC").Find(&smsPayments).Error
	for _, smsP := range smsPayments {
		t := tenantMap[smsP.TenantID.String()]
		tenantName := t.Name
		if tenantName == "" {
			tenantName = "Unknown School"
		}

		status := smsP.Status
		if status == "" {
			status = "PENDING"
		}

		rec := domain.PlatformPaymentRecord{
			ID:                    smsP.ID.String(),
			Reference:             smsP.Reference,
			TenantID:              smsP.TenantID.String(),
			TenantName:            tenantName,
			TenantSubdomain:       t.Subdomain,
			PayerEmail:            smsP.PayerEmail,
			PayerName:             "School Administrator",
			PayerRole:             "Administrator",
			Category:              "SMS_CREDITS",
			RoutingType:           "MAIN_ACCOUNT",
			SettlementDestination: "Platform SMS Communications Vault",
			Amount:                smsP.Amount,
			Currency:              "GHS",
			Status:                status,
			Provider:              smsP.Provider,
			IsMisrouted:           false,
			CreatedAt:             smsP.CreatedAt,
			UpdatedAt:             smsP.UpdatedAt,
		}

		if recon, exists := reconcileMap[smsP.Reference]; exists {
			rec.Reconciled = recon.IsReconciled
			rec.ReconciliationNote = recon.AdminNotes
			rec.RemittanceRef = recon.RemittanceRef
			tRecon := recon.ReconciledAt
			rec.ReconciledAt = &tRecon
			rec.ReconciledBy = recon.ReconciledBy
			rec.RefundReason = recon.RefundReason
			rec.RefundedAt = recon.RefundedAt
			rec.RefundedBy = recon.RefundedBy
			if recon.ReconciliationType == "REFUNDED_TO_PAYER" {
				rec.Status = "REFUNDED"
			}
		}

		records = append(records, rec)
	}

	// 4. Compute Global Summary Before Filtering
	var summary domain.PlatformFinanceLedgerSummary
	for _, r := range records {
		summary.TotalVolume += r.Amount
		summary.TotalTransactionsCount++

		if r.Status == "SUCCESS" || r.Status == "PAID" {
			summary.SuccessfulVolume += r.Amount
		}

		if r.RoutingType == "SUBACCOUNT" {
			summary.SubaccountVolume += r.Amount
		} else if r.RoutingType == "MAIN_ACCOUNT" {
			summary.MainAccountVolume += r.Amount
		}

		if r.IsMisrouted && !r.Reconciled {
			summary.MisroutedUnreconciledVol += r.Amount
			summary.MisroutedCount++
		}

		switch r.Category {
		case "SCHOOL_FEES":
			summary.TotalSchoolFeesVolume += r.Amount
		case "WALLET_TOPUP":
			summary.TotalWalletTopUpVolume += r.Amount
		case "TENANT_SUBSCRIPTION":
			summary.TotalSaaSSubscriptionVol += r.Amount
		case "SMS_CREDITS":
			summary.TotalSMSCreditsVolume += r.Amount
		}
	}

	// 5. Apply Filters
	filtered := make([]domain.PlatformPaymentRecord, 0, len(records))
	for _, r := range records {
		if tenantFilter != "" && r.TenantID != tenantFilter {
			continue
		}
		if categoryFilter != "" && categoryFilter != "ALL" && r.Category != categoryFilter {
			continue
		}
		if routingFilter != "" && routingFilter != "ALL" && r.RoutingType != routingFilter {
			continue
		}
		if statusFilter != "" && statusFilter != "ALL" && r.Status != statusFilter {
			continue
		}
		if misroutedOnly && (!r.IsMisrouted || r.Reconciled) {
			continue
		}
		if search != "" {
			match := strings.Contains(strings.ToLower(r.Reference), search) ||
				strings.Contains(strings.ToLower(r.TenantName), search) ||
				strings.Contains(strings.ToLower(r.TenantSubdomain), search) ||
				strings.Contains(strings.ToLower(r.PayerEmail), search) ||
				strings.Contains(strings.ToLower(r.PayerName), search) ||
				strings.Contains(strings.ToLower(r.StudentName), search) ||
				strings.Contains(strings.ToLower(r.SubaccountCode), search) ||
				strings.Contains(strings.ToLower(r.SettlementDestination), search)
			if !match {
				continue
			}
		}
		filtered = append(filtered, r)
	}

	// 6. Sort Chronologically (Newest first)
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
	})

	// 7. Paginate
	totalFiltered := len(filtered)
	startIndex := (page - 1) * pageSize
	endIndex := startIndex + pageSize

	if startIndex > totalFiltered {
		startIndex = totalFiltered
	}
	if endIndex > totalFiltered {
		endIndex = totalFiltered
	}

	paginated := filtered[startIndex:endIndex]
	totalPages := (totalFiltered + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": paginated,
		"meta": gin.H{
			"total_count": totalFiltered,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
		"summary": summary,
	})
}

// ReconcileTransaction records that a mistakenly routed payment has been manually remitted/forwarded to the school.
func (h *FinanceHandler) ReconcileTransaction(c *gin.Context) {
	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference is required"})
		return
	}

	var req struct {
		ReconciliationType string `json:"reconciliation_type"` // 'REMITTED_TO_SCHOOL', 'MANUAL_ADJUSTMENT'
		RemittanceRef      string `json:"remittance_ref"`
		AdminNotes         string `json:"admin_notes"`
		ReconciledBy       string `json:"reconciled_by"`
		TenantID           string `json:"tenant_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.ReconciliationType == "" {
		req.ReconciliationType = "REMITTED_TO_SCHOOL"
	}

	var tenantUUID uuid.UUID
	if req.TenantID != "" {
		tenantUUID, _ = uuid.Parse(req.TenantID)
	}

	recon := domain.PlatformPaymentReconciliation{
		Reference:          reference,
		TenantID:           tenantUUID,
		ReconciliationType: req.ReconciliationType,
		IsReconciled:       true,
		RemittanceRef:      req.RemittanceRef,
		AdminNotes:         req.AdminNotes,
		ReconciledBy:       req.ReconciledBy,
		ReconciledAt:       time.Now(),
	}

	if err := h.db.Save(&recon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save reconciliation record: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Transaction successfully reconciled and marked as remitted to school.",
		"reconciliation": recon,
	})
}

// RefundTransaction records or triggers a refund for a transaction.
func (h *FinanceHandler) RefundTransaction(c *gin.Context) {
	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference is required"})
		return
	}

	var req struct {
		Reason       string `json:"reason" binding:"required"`
		AdminNotes   string `json:"admin_notes"`
		RefundedBy   string `json:"refunded_by"`
		TenantID     string `json:"tenant_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refund reason is required"})
		return
	}

	var tenantUUID uuid.UUID
	if req.TenantID != "" {
		tenantUUID, _ = uuid.Parse(req.TenantID)
	}

	now := time.Now()
	recon := domain.PlatformPaymentReconciliation{
		Reference:          reference,
		TenantID:           tenantUUID,
		ReconciliationType: "REFUNDED_TO_PAYER",
		IsReconciled:       true,
		RefundReason:       req.Reason,
		AdminNotes:         req.AdminNotes,
		RefundedBy:         req.RefundedBy,
		RefundedAt:         &now,
		ReconciledBy:       req.RefundedBy,
		ReconciledAt:       now,
	}

	if err := h.db.Save(&recon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record refund: " + err.Error()})
		return
	}

	// Also update the underlying transaction table if applicable
	h.db.Model(&domain.PaymentTransaction{}).Where("reference = ?", reference).Update("status", domain.PaymentStatusRefunded)
	h.db.Model(&domain.TenantSubscriptionPayment{}).Where("reference = ?", reference).Update("status", "REFUNDED")
	h.db.Model(&domain.SMSTopUpPayment{}).Where("reference = ?", reference).Update("status", "REFUNDED")

	c.JSON(http.StatusOK, gin.H{
		"message": "Transaction refund recorded successfully.",
		"refund":  recon,
	})
}

// VerifyTransaction re-queries Paystack API to verify transaction settlement and updates DB.
func (h *FinanceHandler) VerifyTransaction(c *gin.Context) {
	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference is required"})
		return
	}

	if h.paystackSvc == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paystack gateway service not configured on platform."})
		return
	}

	status, err := h.paystackSvc.VerifyTransaction(reference)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paystack verification error: " + err.Error()})
		return
	}

	// Map paystack status to our standard status
	normalizedStatus := "PENDING"
	if status == "success" {
		normalizedStatus = "SUCCESS"
	} else if status == "failed" || status == "abandoned" {
		normalizedStatus = "FAILED"
	}

	// Update local tables
	h.db.Model(&domain.PaymentTransaction{}).Where("reference = ?", reference).Update("status", normalizedStatus)
	h.db.Model(&domain.TenantSubscriptionPayment{}).Where("reference = ?", reference).Update("status", normalizedStatus)
	h.db.Model(&domain.SMSTopUpPayment{}).Where("reference = ?", reference).Update("status", normalizedStatus)

	c.JSON(http.StatusOK, gin.H{
		"reference": reference,
		"status":    normalizedStatus,
		"message":   "Transaction verification synced with Paystack.",
	})
}

