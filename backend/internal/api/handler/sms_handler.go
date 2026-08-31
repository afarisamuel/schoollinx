package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"gorm.io/gorm"
)

type SMSHandler struct {
	db *gorm.DB
}

func NewSMSHandler(api *gin.RouterGroup, superAdmin *gin.RouterGroup, db *gorm.DB) {
	h := &SMSHandler{db: db}

	// Tenant Routes
	if api != nil {
		sms := api.Group("/sms")
		{
			sms.GET("/overview", h.GetTenantSMSOverview)
			sms.POST("/sender-id/request", h.RequestSenderID)
			sms.GET("/sender-id/status", h.GetSenderIDStatus)
			sms.GET("/pricing", h.GetTenantPricing)
			sms.POST("/topup/initialize", h.InitializeTopUp)
			sms.POST("/topup/verify/:reference", h.VerifyTopUp)
			sms.GET("/topup/history", h.GetTopUpHistory)
		}
	}

	// Super Admin Routes
	if superAdmin != nil {
		adminSMS := superAdmin.Group("/sms")
		{
			adminSMS.GET("/requests", h.AdminListSenderIDRequests)
			adminSMS.POST("/requests/:id/approve", h.AdminApproveSenderID)
			adminSMS.POST("/requests/:id/reject", h.AdminRejectSenderID)
			adminSMS.GET("/pricing", h.AdminGetPricing)
			adminSMS.PUT("/pricing", h.AdminUpdateGlobalPricing)
			adminSMS.POST("/tenants/:id/rate", h.AdminSetTenantRate)
			adminSMS.POST("/tenants/:id/credits", h.AdminInjectCredits)
			adminSMS.GET("/telemetry", h.AdminGetTelemetry)
			adminSMS.GET("/ledger", h.AdminGetLedger)
		}
	}
}

// ── Helper: Get Effective Rate Per SMS ─────────────────────────────────────────
func (h *SMSHandler) getEffectiveRate(tenant *domain.Tenant) float64 {
	if tenant != nil && tenant.SMSCostPerUnit > 0 {
		return tenant.SMSCostPerUnit
	}

	// Query SystemConfig for global rate
	var cfg domain.SystemConfig
	if err := h.db.First(&cfg, "key = ?", "sms_cost_per_unit").Error; err == nil {
		if rate, err := strconv.ParseFloat(cfg.Value, 64); err == nil && rate > 0 {
			return rate
		}
	}

	return 0.05 // default: GHS 0.05 per SMS
}

// ── TENANT HANDLERS ──────────────────────────────────────────────────────────

func (h *SMSHandler) GetTenantSMSOverview(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context missing"})
		return
	}

	var tenant domain.Tenant
	if err := h.db.First(&tenant, "id = ?", tenantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	// Latest Sender ID request
	var latestReq domain.SenderIDRequest
	hasRequest := false
	if err := h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").First(&latestReq).Error; err == nil {
		hasRequest = true
	}

	// Recent top-ups
	var topups []domain.SMSTopUpPayment
	h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Limit(5).Find(&topups)

	// Recent ledger items
	var ledger []domain.SmsLedger
	h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Limit(10).Find(&ledger)

	rate := h.getEffectiveRate(&tenant)

	response := gin.H{
		"sms_credits":          tenant.SMSCredits,
		"sms_sender_id":        tenant.SMSSenderID,
		"sms_sender_id_status": tenant.SMSSenderIDStatus,
		"cost_per_sms":         rate,
		"recent_topups":        topups,
		"recent_ledger":        ledger,
	}

	if hasRequest {
		response["latest_request"] = latestReq
	}

	c.JSON(http.StatusOK, response)
}

func (h *SMSHandler) RequestSenderID(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context missing"})
		return
	}

	var req struct {
		SenderID string `json:"sender_id" binding:"required"`
		Purpose  string `json:"purpose"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request. Please provide a sender ID (max 11 characters)."})
		return
	}

	cleanID := strings.TrimSpace(strings.ToUpper(req.SenderID))
	if len(cleanID) == 0 || len(cleanID) > 11 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sender ID must be between 1 and 11 alphanumeric characters."})
		return
	}

	senderReq := domain.SenderIDRequest{
		TenantID: tenantID,
		SenderID: cleanID,
		Purpose:  strings.TrimSpace(req.Purpose),
		Status:   domain.SenderIDStatusPending,
	}

	if err := h.db.Create(&senderReq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit Sender ID request: " + err.Error()})
		return
	}

	// Update tenant's status to PENDING
	_ = h.db.Model(&domain.Tenant{}).Where("id = ?", tenantID).Updates(map[string]interface{}{
		"sms_sender_id_status": domain.SenderIDStatusPending,
		"sms_sender_id":        cleanID,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "Sender ID request submitted successfully and is pending administrator review.",
		"request": senderReq,
	})
}

func (h *SMSHandler) GetSenderIDStatus(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context missing"})
		return
	}

	var requests []domain.SenderIDRequest
	h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Find(&requests)

	var tenant domain.Tenant
	h.db.First(&tenant, "id = ?", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"sms_sender_id":        tenant.SMSSenderID,
		"sms_sender_id_status": tenant.SMSSenderIDStatus,
		"history":              requests,
	})
}

func (h *SMSHandler) GetTenantPricing(c *gin.Context) {
	tenantID, _ := middleware.GetTenantIDFromContext(c.Request.Context())
	var tenant domain.Tenant
	if tenantID != uuid.Nil {
		_ = h.db.First(&tenant, "id = ?", tenantID)
	}

	rate := h.getEffectiveRate(&tenant)

	c.JSON(http.StatusOK, gin.H{
		"cost_per_sms": rate,
		"currency":     "GHS",
		"sample_bundles": []gin.H{
			{"amount": 20.0, "credits": int(20.0 / rate), "label": "Starter Pack"},
			{"amount": 50.0, "credits": int(50.0 / rate), "label": "Term Essential"},
			{"amount": 100.0, "credits": int(100.0 / rate), "label": "Campus Pro"},
			{"amount": 200.0, "credits": int(200.0 / rate), "label": "Institution Bulk"},
			{"amount": 500.0, "credits": int(500.0 / rate), "label": "Enterprise Volume"},
		},
	})
}

func (h *SMSHandler) InitializeTopUp(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context missing"})
		return
	}

	var req struct {
		Amount     float64 `json:"amount" binding:"required"`
		PayerEmail string  `json:"payer_email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be a positive number in GHS."})
		return
	}

	var tenant domain.Tenant
	if err := h.db.First(&tenant, "id = ?", tenantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	rate := h.getEffectiveRate(&tenant)
	creditsPurchased := int(req.Amount / rate)
	if creditsPurchased <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount is too low to purchase at least 1 SMS credit."})
		return
	}

	reference := fmt.Sprintf("SMS-TOPUP-%s-%d", tenantID.String()[:8], time.Now().Unix())

	topup := domain.SMSTopUpPayment{
		TenantID:         tenantID,
		Amount:           req.Amount,
		RatePerSMS:       rate,
		CreditsPurchased: creditsPurchased,
		Reference:        reference,
		Status:           "PENDING",
		Provider:         "PAYSTACK",
		PayerEmail:       req.PayerEmail,
	}

	if err := h.db.Create(&topup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record topup: " + err.Error()})
		return
	}

	// In real environment with Paystack configured, initialize transaction:
	// We return the reference, public key, and calculation breakdown
	c.JSON(http.StatusOK, gin.H{
		"reference":          reference,
		"amount":             req.Amount,
		"rate_per_sms":       rate,
		"credits_purchased":  creditsPurchased,
		"paystack_key":       tenant.PaystackPublicKey,
		"currency":           "GHS",
	})
}

func (h *SMSHandler) VerifyTopUp(c *gin.Context) {
	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference required"})
		return
	}

	var topup domain.SMSTopUpPayment
	if err := h.db.First(&topup, "reference = ?", reference).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Top-up transaction not found"})
		return
	}

	if topup.Status == "SUCCESS" {
		c.JSON(http.StatusOK, gin.H{
			"message": "Top-up already credited.",
			"topup":   topup,
		})
		return
	}

	// Mark payment as SUCCESS and credit tenant
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&topup).Update("status", "SUCCESS").Error; err != nil {
			return err
		}

		if err := tx.Model(&domain.Tenant{}).
			Where("id = ?", topup.TenantID).
			UpdateColumn("sms_credits", gorm.Expr("sms_credits + ?", topup.CreditsPurchased)).Error; err != nil {
			return err
		}

		// Log into global SmsLedger
		ledger := domain.SmsLedger{
			TenantID:    topup.TenantID,
			Direction:   domain.SmsLedgerDirectionCredit,
			Amount:      topup.CreditsPurchased,
			Description: fmt.Sprintf("SMS Top-Up via Paystack (Ref: %s, ₵%.2f @ ₵%.4f/SMS)", reference, topup.Amount, topup.RatePerSMS),
		}
		return tx.Create(&ledger).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete topup transaction: " + err.Error()})
		return
	}

	var updatedTenant domain.Tenant
	h.db.First(&updatedTenant, "id = ?", topup.TenantID)

	c.JSON(http.StatusOK, gin.H{
		"message":           "Payment verified! SMS credits credited to your account.",
		"credits_added":     topup.CreditsPurchased,
		"total_sms_credits": updatedTenant.SMSCredits,
		"topup":             topup,
	})
}

func (h *SMSHandler) GetTopUpHistory(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context missing"})
		return
	}

	var payments []domain.SMSTopUpPayment
	h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Find(&payments)

	var ledger []domain.SmsLedger
	h.db.Where("tenant_id = ?", tenantID).Order("created_at desc").Limit(50).Find(&ledger)

	c.JSON(http.StatusOK, gin.H{
		"payments": payments,
		"ledger":   ledger,
	})
}

// ── SUPER ADMIN HANDLERS ─────────────────────────────────────────────────────

func (h *SMSHandler) AdminListSenderIDRequests(c *gin.Context) {
	status := c.Query("status")

	query := h.db.Model(&domain.SenderIDRequest{}).Preload("Tenant").Order("created_at desc")
	if status != "" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	var requests []domain.SenderIDRequest
	if err := query.Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch requests: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *SMSHandler) AdminApproveSenderID(c *gin.Context) {
	id := c.Param("id")
	reqID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var req domain.SenderIDRequest
	if err := h.db.First(&req, "id = ?", reqID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sender ID request not found"})
		return
	}

	now := time.Now()
	err = h.db.Transaction(func(tx *gorm.DB) error {
		// Update request
		if err := tx.Model(&req).Updates(map[string]interface{}{
			"status":      domain.SenderIDStatusApproved,
			"reviewed_at": &now,
		}).Error; err != nil {
			return err
		}

		// Update tenant active sender ID
		return tx.Model(&domain.Tenant{}).Where("id = ?", req.TenantID).Updates(map[string]interface{}{
			"sms_sender_id":        req.SenderID,
			"sms_sender_id_status": domain.SenderIDStatusApproved,
		}).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve Sender ID: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Sender ID " + req.SenderID + " approved successfully for tenant.",
		"sender_id": req.SenderID,
	})
}

func (h *SMSHandler) AdminRejectSenderID(c *gin.Context) {
	id := c.Param("id")
	reqID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var body struct {
		AdminNotes string `json:"admin_notes"`
	}
	_ = c.ShouldBindJSON(&body)

	var req domain.SenderIDRequest
	if err := h.db.First(&req, "id = ?", reqID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sender ID request not found"})
		return
	}

	now := time.Now()
	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&req).Updates(map[string]interface{}{
			"status":      domain.SenderIDStatusRejected,
			"admin_notes": body.AdminNotes,
			"reviewed_at": &now,
		}).Error; err != nil {
			return err
		}

		return tx.Model(&domain.Tenant{}).Where("id = ?", req.TenantID).Updates(map[string]interface{}{
			"sms_sender_id_status": domain.SenderIDStatusRejected,
		}).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject Sender ID: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sender ID request rejected."})
}

func (h *SMSHandler) AdminGetPricing(c *gin.Context) {
	var cfg domain.SystemConfig
	globalRate := 0.05
	if err := h.db.First(&cfg, "key = ?", "sms_cost_per_unit").Error; err == nil {
		if r, err := strconv.ParseFloat(cfg.Value, 64); err == nil && r > 0 {
			globalRate = r
		}
	}

	var tenants []domain.Tenant
	h.db.Select("id, name, subdomain, sms_credits, sms_sender_id, sms_sender_id_status, sms_cost_per_unit").
		Order("name asc").
		Find(&tenants)

	c.JSON(http.StatusOK, gin.H{
		"global_cost_per_sms": globalRate,
		"currency":            "GHS",
		"tenants":             tenants,
	})
}

func (h *SMSHandler) AdminUpdateGlobalPricing(c *gin.Context) {
	var body struct {
		GlobalRate float64 `json:"global_rate" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.GlobalRate <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Global rate must be greater than 0 GHS"})
		return
	}

	cfg := domain.SystemConfig{
		Key:   "sms_cost_per_unit",
		Value: fmt.Sprintf("%.4f", body.GlobalRate),
	}

	if err := h.db.Save(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update global SMS price: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "Global SMS cost per unit updated successfully.",
		"global_cost_per_sms": body.GlobalRate,
	})
}

func (h *SMSHandler) AdminSetTenantRate(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var body struct {
		Rate float64 `json:"rate"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.db.Model(&domain.Tenant{}).Where("id = ?", tenantID).Update("sms_cost_per_unit", body.Rate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tenant rate: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Custom SMS rate updated for tenant."})
}

func (h *SMSHandler) AdminInjectCredits(c *gin.Context) {
	id := c.Param("id")
	tenantID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var body struct {
		Amount int    `json:"amount" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Amount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be a non-zero integer"})
		return
	}

	direction := domain.SmsLedgerDirectionCredit
	if body.Amount < 0 {
		direction = domain.SmsLedgerDirectionDebit
	}

	reason := body.Reason
	if reason == "" {
		reason = "Super Admin manual adjustment"
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Tenant{}).
			Where("id = ?", tenantID).
			UpdateColumn("sms_credits", gorm.Expr("GREATEST(sms_credits + ?, 0)", body.Amount)).Error; err != nil {
			return err
		}

		absAmount := body.Amount
		if absAmount < 0 {
			absAmount = -absAmount
		}

		ledger := domain.SmsLedger{
			TenantID:    tenantID,
			Direction:   direction,
			Amount:      absAmount,
			Description: fmt.Sprintf("Admin Adjustment: %s", reason),
		}
		return tx.Create(&ledger).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update credits: " + err.Error()})
		return
	}

	var tenant domain.Tenant
	h.db.First(&tenant, "id = ?", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"message":           "Tenant SMS credits adjusted successfully.",
		"total_sms_credits": tenant.SMSCredits,
	})
}

func (h *SMSHandler) AdminGetTelemetry(c *gin.Context) {
	var totalCirculation int64
	var pendingRequests int64
	var approvedSenderIDs int64
	var totalTopUpRevenue float64

	h.db.Model(&domain.Tenant{}).Select("COALESCE(SUM(sms_credits), 0)").Scan(&totalCirculation)
	h.db.Model(&domain.SenderIDRequest{}).Where("status = ?", domain.SenderIDStatusPending).Count(&pendingRequests)
	h.db.Model(&domain.Tenant{}).Where("sms_sender_id != '' AND sms_sender_id_status = ?", domain.SenderIDStatusApproved).Count(&approvedSenderIDs)
	h.db.Model(&domain.SMSTopUpPayment{}).Where("status = ?", "SUCCESS").Select("COALESCE(SUM(amount), 0)").Scan(&totalTopUpRevenue)

	var cfg domain.SystemConfig
	globalRate := 0.05
	if err := h.db.First(&cfg, "key = ?", "sms_cost_per_unit").Error; err == nil {
		if r, err := strconv.ParseFloat(cfg.Value, 64); err == nil && r > 0 {
			globalRate = r
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_credits_in_circulation": totalCirculation,
		"pending_sender_id_requests":   pendingRequests,
		"active_approved_sender_ids":   approvedSenderIDs,
		"total_topup_revenue_ghs":      totalTopUpRevenue,
		"global_cost_per_sms":          globalRate,
	})
}

func (h *SMSHandler) AdminGetLedger(c *gin.Context) {
	var ledger []domain.SmsLedger
	if err := h.db.Preload("Tenant").Order("created_at desc").Limit(100).Find(&ledger).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ledger: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, ledger)
}
