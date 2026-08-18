package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"gorm.io/gorm"
)

type TenantProfileHandler struct {
	db *gorm.DB
	uc usecase.TenantUseCase
}

func NewTenantProfileHandler(r *gin.RouterGroup, db *gorm.DB, uc usecase.TenantUseCase) {
	h := &TenantProfileHandler{db: db, uc: uc}
	r.GET("/tenant/profile", h.GetProfile)
	r.PUT("/tenant/payment-config", h.UpdatePaymentConfig)
	r.POST("/tenant/subscription/pay", h.InitializeSubscriptionPayment)
	r.GET("/tenant/subscription/history", h.GetSubscriptionHistory)
}

// NewPublicTenantHandler registers routes that do NOT require authentication.
func NewPublicTenantHandler(r *gin.RouterGroup, db *gorm.DB) {
	h := &TenantProfileHandler{db: db}
	r.GET("/tenant-info", h.GetPublicInfo)
	r.GET("/announcements", h.GetActiveAnnouncements)
	r.POST("/contact", h.SubmitContactForm)
}

// SubmitContactForm handles public contact form submissions and saves them to the database.
func (h *TenantProfileHandler) SubmitContactForm(c *gin.Context) {
	var req struct {
		FullName   string `json:"full_name" binding:"required"`
		WorkEmail  string `json:"work_email" binding:"required,email"`
		SchoolName string `json:"school_name" binding:"required"`
		Message    string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please fill in all required fields with valid data."})
		return
	}

	submission := domain.ContactSubmission{
		FullName:   req.FullName,
		WorkEmail:  req.WorkEmail,
		SchoolName: req.SchoolName,
		Message:    req.Message,
		Status:     "UNREAD",
	}

	if err := h.db.Table("public.contact_submissions").Create(&submission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save your message. Please try again."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Thank you! Your message has been received. Our team will be in touch shortly."})
}

// GetPublicInfo returns safe, public-facing tenant info (name, logo) given the
// subdomain supplied via the X-Tenant-Subdomain header. No auth required.
func (h *TenantProfileHandler) GetPublicInfo(c *gin.Context) {
	subdomain := c.GetHeader("X-Tenant-Subdomain")
	if subdomain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-Subdomain header is required"})
		return
	}

	var t domain.Tenant
	if err := h.db.Where("subdomain = ?", subdomain).First(&t).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"name":          t.Name,
		"subdomain":     t.Subdomain,
		"trial_ends_at": t.TrialEndsAt,
	})
}

func (h *TenantProfileHandler) GetActiveAnnouncements(c *gin.Context) {
	var announcements []domain.SystemAnnouncement
	if err := h.db.Table("public.system_announcements").Where("is_active = ?", true).Order("created_at desc").Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}
	c.JSON(http.StatusOK, announcements)
}

func (h *TenantProfileHandler) GetProfile(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var t domain.Tenant
	if err := h.db.Where("id = ?", tenantID).First(&t).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

func (h *TenantProfileHandler) UpdatePaymentConfig(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var req struct {
		PaystackPublicKey string `json:"paystack_public_key"`
		PaystackSecretKey string `json:"paystack_secret_key"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	var t domain.Tenant
	if err := h.db.Where("id = ?", tenantID).First(&t).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	t.PaystackPublicKey = req.PaystackPublicKey
	t.PaystackSecretKey = encryption.EncryptedString(req.PaystackSecretKey)

	if err := h.db.Save(&t).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payment config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment configuration updated successfully"})
}

func (h *TenantProfileHandler) InitializeSubscriptionPayment(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var req struct {
		PayerEmail   string `json:"payer_email" binding:"required,email"`
		StudentCount int    `json:"student_count" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payer_email and student_count are required"})
		return
	}

	authURL, err := h.uc.InitializeSubscriptionPayment(c.Request.Context(), tenantID.String(), req.PayerEmail, req.StudentCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"authorization_url": authURL})
}

func (h *TenantProfileHandler) GetSubscriptionHistory(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	history, err := h.uc.GetSubscriptionHistory(c.Request.Context(), tenantID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}


