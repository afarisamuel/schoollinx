package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	r.GET("/tenant/setup-progress", h.GetSetupProgress)
	r.PUT("/tenant/profile", h.UpdateProfile)
	r.POST("/tenant/profile/logo", h.UploadLogo)
	r.POST("/tenant/profile/headmaster-signature", h.UploadHeadmasterSignature)
	r.PUT("/tenant/payment-config", h.UpdatePaymentConfig)
	r.GET("/tenant/paystack/countries", h.GetPaystackCountries)
	r.GET("/tenant/paystack/banks", h.GetPaystackBanks)
	r.POST("/tenant/paystack/resolve-account", h.ResolvePaystackAccount)
	r.POST("/tenant/paystack/subaccount", h.CreatePaystackSubaccount)
	r.GET("/tenant/paystack/subaccount", h.GetPaystackSubaccount)
	r.DELETE("/tenant/paystack/subaccount", h.RemovePaystackSubaccount)
	r.POST("/tenant/subscription/pay", h.InitializeSubscriptionPayment)
	r.POST("/tenant/subscription/verify/:reference", h.VerifySubscriptionPayment)
	r.GET("/tenant/subscription/history", h.GetSubscriptionHistory)
	r.GET("/tenant/subscription/summary", h.GetSubscriptionSummary)
}

// NewPublicTenantHandler registers routes that do NOT require authentication.
func NewPublicTenantHandler(r *gin.RouterGroup, db *gorm.DB) {
	h := &TenantProfileHandler{db: db}
	r.GET("/tenant-info", h.GetPublicInfo)
	r.GET("/tenant-manifest", h.GetTenantManifest)
	r.GET("/manifest.webmanifest", h.GetTenantManifest)
	r.GET("/announcements", h.GetActiveAnnouncements)
	r.POST("/contact", h.SubmitContactForm)
}

// RegisterRootPublicRoutes registers root-level public endpoints like /manifest.webmanifest
func RegisterRootPublicRoutes(engine *gin.Engine, db *gorm.DB) {
	h := &TenantProfileHandler{db: db}
	engine.GET("/manifest.webmanifest", h.GetTenantManifest)
	engine.GET("/tenant-manifest", h.GetTenantManifest)
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
		c.JSON(http.StatusOK, gin.H{
			"name":      "School Linx",
			"subdomain": "",
			"logo_url":  "",
		})
		return
	}

	var t domain.Tenant
	if err := h.db.Where("subdomain = ?", subdomain).First(&t).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"name":      "School Linx",
			"subdomain": subdomain,
			"logo_url":  "",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"name":          t.Name,
		"subdomain":     t.Subdomain,
		"logo_url":      t.LogoURL,
		"website":       t.Website,
		"trial_ends_at": t.TrialEndsAt,
	})
}

// GetTenantManifest serves a dynamic PWA Web App Manifest customized with the school's name and logo.
func (h *TenantProfileHandler) GetTenantManifest(c *gin.Context) {
	subdomain := c.Query("subdomain")
	if subdomain == "" {
		subdomain = c.GetHeader("X-Tenant-Subdomain")
	}
	if subdomain == "" {
		// Try to derive subdomain from Host header (e.g. "kendemy.schoollinx.com")
		host := c.Request.Host
		parts := strings.SplitN(host, ".", 2)
		if len(parts) == 2 && parts[0] != "www" && parts[0] != "api" && parts[0] != "hq" {
			subdomain = parts[0]
		}
	}

	// The frontend passes window.location.origin so we can build absolute URLs
	// that are same-origin with the document — required by Chrome's PWA spec.
	// e.g. "https://kendemy.schoollinx.com"
	docOrigin := c.Query("origin")
	if docOrigin == "" {
		// Fallback: reconstruct from subdomain
		if subdomain != "" {
			docOrigin = "https://" + subdomain + ".schoollinx.com"
		} else {
			docOrigin = "https://schoollinx.com"
		}
	}
	// Strip trailing slash for safe concatenation
	docOrigin = strings.TrimRight(docOrigin, "/")

	appName := "SchoolLinx — Institutional Operating System"
	shortName := "SchoolLinx"
	iconSrc := docOrigin + "/app-icon.png"

	if subdomain != "" && h.db != nil {
		var t domain.Tenant
		if err := h.db.Table("public.tenants").Where("subdomain = ? AND is_active = true", subdomain).First(&t).Error; err == nil {
			if t.Name != "" {
				appName = t.Name
				shortName = t.Name
				if len(shortName) > 20 {
					shortName = shortName[:20]
				}
			}
			if t.LogoURL != "" {
				// Force HTTPS to avoid mixed-content warnings
				iconSrc = strings.Replace(t.LogoURL, "http://", "https://", 1)
			}
		}
	}

	iconType := "image/png"
	icon512 := iconSrc
	icon192 := iconSrc

	manifest := gin.H{
		"name":             appName,
		"short_name":       shortName,
		"description":      appName + " Portal",
		"start_url":        docOrigin + "/",
		"scope":            docOrigin + "/",
		"display":          "standalone",
		"background_color": "#0f172a",
		"theme_color":      "#1e293b",
		"orientation":      "portrait-primary",
		"icons": []gin.H{
			{
				"src":     icon512,
				"sizes":   "512x512",
				"type":    iconType,
				"purpose": "any maskable",
			},
			{
				"src":     icon192,
				"sizes":   "192x192",
				"type":    iconType,
				"purpose": "any maskable",
			},
			{
				"src":   docOrigin + "/favicon.ico",
				"sizes": "64x64 32x32 24x24 16x16",
				"type":  "image/x-icon",
			},
		},
		"categories": []string{"education", "productivity"},
		"shortcuts": []gin.H{
			{
				"name":        "Dashboard",
				"url":         docOrigin + "/dashboard",
				"description": "View institutional executive dashboard",
			},
			{
				"name":        "Student Roster",
				"url":         docOrigin + "/students",
				"description": "Access core student registry",
			},
			{
				"name":        "Attendance Register",
				"url":         docOrigin + "/attendance/mark",
				"description": "Record daily attendance",
			},
		},
	}

	c.Header("Content-Type", "application/manifest+json")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type")
	c.Header("Cache-Control", "public, max-age=300") // 5-minute cache
	c.JSON(http.StatusOK, manifest)
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

func (h *TenantProfileHandler) UpdateProfile(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var req struct {
		Name                   string `json:"name"`
		Address                string `json:"address"`
		ContactNumbers         string `json:"contact_numbers"`
		Email                  string `json:"email"`
		Website                string `json:"website"`
		LogoURL                string `json:"logo_url"`
		HeadmasterSignatureURL string `json:"headmaster_signature_url"`
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

	// Only update provided (non-empty) fields
	if req.Name != "" {
		t.Name = req.Name
	}
	if req.Address != "" {
		t.Address = req.Address
	}
	if req.ContactNumbers != "" {
		t.ContactNumbers = req.ContactNumbers
	}
	if req.Email != "" {
		t.Email = req.Email
	}
	t.Website = req.Website
	// Logo URL can be explicitly set (even to clear it by passing empty)
	t.LogoURL = req.LogoURL
	t.HeadmasterSignatureURL = req.HeadmasterSignatureURL

	if err := h.db.Save(&t).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, t)
}

func (h *TenantProfileHandler) UploadLogo(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
		return
	}

	// Validate file type
	ext := filepath.Ext(file.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG and PNG files are allowed"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/logos"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Save file with unique name
	fileName := fmt.Sprintf("%s%s", tenantID, ext)
	filePath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Construct URL
	host := c.Request.Host
	scheme := "https"
	if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	} else if c.Request.TLS != nil {
		scheme = "https"
	}
	fileURL := fmt.Sprintf("%s://%s/uploads/logos/%s", scheme, host, fileName)

	c.JSON(http.StatusOK, gin.H{"url": fileURL})
}

func (h *TenantProfileHandler) UploadHeadmasterSignature(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	file, err := c.FormFile("signature")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
		return
	}

	// Validate file type
	ext := filepath.Ext(file.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG and PNG files are allowed"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/signatures/headmaster"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Save file with unique name
	fileName := fmt.Sprintf("%s%s", tenantID, ext)
	filePath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Construct URL
	host := c.Request.Host
	scheme := "https"
	if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	} else if c.Request.TLS != nil {
		scheme = "https"
	}
	fileURL := fmt.Sprintf("%s://%s/uploads/signatures/headmaster/%s", scheme, host, fileName)

	c.JSON(http.StatusOK, gin.H{"url": fileURL})
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

func (h *TenantProfileHandler) GetPaystackCountries(c *gin.Context) {
	countries := h.uc.GetPaystackCountries()
	c.JSON(http.StatusOK, countries)
}

func (h *TenantProfileHandler) GetPaystackBanks(c *gin.Context) {
	country := c.Query("country")
	if country == "" {
		country = "ghana"
	}
	banks, err := h.uc.GetPaystackBanks(country)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, banks)
}

func (h *TenantProfileHandler) ResolvePaystackAccount(c *gin.Context) {
	var req struct {
		AccountNumber string `json:"account_number" binding:"required"`
		BankCode      string `json:"bank_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "account_number and bank_code are required"})
		return
	}

	resolved, err := h.uc.ResolvePaystackAccount(req.AccountNumber, req.BankCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resolved)
}

func (h *TenantProfileHandler) CreatePaystackSubaccount(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var req usecase.CreateSubaccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenant, err := h.uc.CreateAndLinkSubaccount(c.Request.Context(), tenantID.String(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Paystack Subaccount successfully created and linked to school",
		"subaccount_code": tenant.PaystackSubaccountCode,
		"bank_name":       tenant.PaystackBankName,
		"account_number":  tenant.PaystackAccountNumber,
		"account_name":    tenant.PaystackAccountName,
	})
}

func (h *TenantProfileHandler) GetPaystackSubaccount(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	config, err := h.uc.GetSubaccountConfig(c.Request.Context(), tenantID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

func (h *TenantProfileHandler) RemovePaystackSubaccount(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	if err := h.uc.RemoveSubaccount(c.Request.Context(), tenantID.String()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subaccount successfully unlinked"})
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
		CallbackURL  string `json:"callback_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payer_email and student_count are required"})
		return
	}

	authURL, reference, err := h.uc.InitializeSubscriptionPayment(c.Request.Context(), tenantID.String(), req.PayerEmail, req.StudentCount, req.CallbackURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authorization_url": authURL,
		"reference":         reference,
	})
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

func (h *TenantProfileHandler) VerifySubscriptionPayment(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reference is required"})
		return
	}

	if err := h.uc.VerifySubscriptionPayment(c.Request.Context(), tenantID.String(), reference); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment verified"})
}

func (h *TenantProfileHandler) GetSubscriptionSummary(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	summary, err := h.uc.GetSubscriptionSummary(c.Request.Context(), tenantID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

type SetupStep struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Route       string `json:"route"`
	Completed   bool   `json:"completed"`
	Category    string `json:"category"`
	Icon        string `json:"icon"`
	Count       int64  `json:"count"`
}

type SetupProgressResponse struct {
	OverallProgress int         `json:"overall_progress"`
	IsComplete      bool        `json:"is_complete"`
	CompletedSteps  int         `json:"completed_steps"`
	TotalSteps      int         `json:"total_steps"`
	Steps           []SetupStep `json:"steps"`
}

func (h *TenantProfileHandler) GetSetupProgress(c *gin.Context) {
	tenantID, exists := middleware.GetTenantIDFromContext(c.Request.Context())
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant context not found"})
		return
	}

	var tenant domain.Tenant
	if err := h.db.Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	ctx := c.Request.Context()

	// 1. Profile / Branding Setup
	profileCompleted := (tenant.LogoURL != "" || tenant.ContactNumbers != "") && (tenant.Address != "" || tenant.Name != "")

	// 2. Scholastic Levels & Academic Calendar
	var scholasticCount int64
	var periodCount int64
	_ = h.db.WithContext(ctx).Model(&domain.ScholasticLevel{}).Count(&scholasticCount).Error
	_ = h.db.WithContext(ctx).Model(&domain.AcademicPeriod{}).Count(&periodCount).Error
	academicCompleted := periodCount > 0

	// 3. Classes & Streams
	var classCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Class{}).Count(&classCount).Error
	classCompleted := classCount > 0

	// 4. Subjects & Curriculum
	var subjectCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Subject{}).Count(&subjectCount).Error
	subjectCompleted := subjectCount > 0

	// 5. Grading Configuration
	var gradeWeightCount int64
	_ = h.db.WithContext(ctx).Model(&domain.GradeWeight{}).Count(&gradeWeightCount).Error
	gradingCompleted := gradeWeightCount > 0

	// 6. Departments & Faculties
	var departmentCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Department{}).Count(&departmentCount).Error
	departmentCompleted := departmentCount > 0

	// 7. Fee Structures & Tariffs
	var feeCount int64
	_ = h.db.WithContext(ctx).Model(&domain.FeeStructure{}).Count(&feeCount).Error
	feeCompleted := feeCount > 0

	// 8. Teaching Staff
	var teacherCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Teacher{}).Count(&teacherCount).Error
	teacherCompleted := teacherCount > 0

	// 9. Student Enrollment
	var studentCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Student{}).Where("status = ?", domain.StatusActive).Count(&studentCount).Error
	studentCompleted := studentCount > 0

	// 10. Parent & Guardian Directory
	var guardianCount int64
	_ = h.db.WithContext(ctx).Model(&domain.Guardian{}).Count(&guardianCount).Error
	guardianCompleted := guardianCount > 0

	// 11. Master Timetable & Scheduling
	var timetableCount int64
	_ = h.db.WithContext(ctx).Model(&domain.TimetableEntry{}).Count(&timetableCount).Error
	timetableCompleted := timetableCount > 0

	// 12. Student Houses & Points
	var houseCount int64
	_ = h.db.WithContext(ctx).Model(&domain.House{}).Count(&houseCount).Error
	houseCompleted := houseCount > 0

	steps := []SetupStep{
		{
			ID:          "profile",
			Title:       "School Profile & Identity",
			Description: "Configure institutional branding, logo, contact information, and address",
			Route:       "/profile",
			Completed:   profileCompleted,
			Category:    "Identity",
			Icon:        "school",
			Count:       1,
		},
		{
			ID:          "academic_period",
			Title:       "Academic Calendar & Terms",
			Description: "Set up active academic years, semester terms, and operational boundaries",
			Route:       "/academic-periods",
			Completed:   academicCompleted,
			Category:    "Curriculum",
			Icon:        "calendar",
			Count:       periodCount,
		},
		{
			ID:          "scholastic_levels",
			Title:       "Scholastic Levels",
			Description: "Define educational progression stages (e.g., Primary, JHS, Senior High)",
			Route:       "/scholastic-levels",
			Completed:   scholasticCount > 0,
			Category:    "Curriculum",
			Icon:        "layers",
			Count:       scholasticCount,
		},
		{
			ID:          "departments",
			Title:       "Departments & Faculties",
			Description: "Structure academic departments (Sciences, Arts, Languages, Commercial)",
			Route:       "/department-management",
			Completed:   departmentCompleted,
			Category:    "Curriculum",
			Icon:        "building",
			Count:       departmentCount,
		},
		{
			ID:          "classes",
			Title:       "Classes & Streams",
			Description: "Create distinct class divisions, rooms, and stream allocations",
			Route:       "/classes",
			Completed:   classCompleted,
			Category:    "Curriculum",
			Icon:        "chalkboard",
			Count:       classCount,
		},
		{
			ID:          "subjects",
			Title:       "Subjects & Courses",
			Description: "Define syllabus courses, academic credits, and departmental assignments",
			Route:       "/subjects",
			Completed:   subjectCompleted,
			Category:    "Curriculum",
			Icon:        "book",
			Count:       subjectCount,
		},
		{
			ID:          "grading",
			Title:       "Assessment & Grading Scales",
			Description: "Set assessment components, continuous assessment %, and GPA boundaries",
			Route:       "/grading-configuration",
			Completed:   gradingCompleted,
			Category:    "Curriculum",
			Icon:        "award",
			Count:       gradeWeightCount,
		},
		{
			ID:          "fees",
			Title:       "Fee Billing & Tariffs",
			Description: "Define termly school fees, tuition schedules, and breakdown line items",
			Route:       "/fiscal/fees",
			Completed:   feeCompleted,
			Category:    "Finance",
			Icon:        "credit-card",
			Count:       feeCount,
		},
		{
			ID:          "teachers",
			Title:       "Faculty & Teaching Staff",
			Description: "Onboard academic staff, assign qualifications, and designate supervisors",
			Route:       "/teachers",
			Completed:   teacherCompleted,
			Category:    "Community",
			Icon:        "users",
			Count:       teacherCount,
		},
		{
			ID:          "students",
			Title:       "Student Enrollment & Roster",
			Description: "Admit students into class cohorts and generate institutional index numbers",
			Route:       "/students",
			Completed:   studentCompleted,
			Category:    "Community",
			Icon:        "graduation-cap",
			Count:       studentCount,
		},
		{
			ID:          "guardians",
			Title:       "Parents & Guardians Directory",
			Description: "Link family guardians, emergency contacts, and portal access accounts",
			Route:       "/guardians",
			Completed:   guardianCompleted,
			Category:    "Community",
			Icon:        "user-group",
			Count:       guardianCount,
		},
		{
			ID:          "timetable",
			Title:       "Master Timetable & Lessons",
			Description: "Schedule weekly class periods, teaching allocations, and room venues",
			Route:       "/timetable",
			Completed:   timetableCompleted,
			Category:    "Curriculum",
			Icon:        "clock",
			Count:       timetableCount,
		},
		{
			ID:          "houses",
			Title:       "Houses & Residential Hostels",
			Description: "Organize student house leagues, boarding dorms, and points tracking",
			Route:       "/house-points",
			Completed:   houseCompleted,
			Category:    "Community",
			Icon:        "shield",
			Count:       houseCount,
		},
	}

	completedCount := 0
	for _, s := range steps {
		if s.Completed {
			completedCount++
		}
	}

	overallPct := int((float64(completedCount) / float64(len(steps))) * 100)

	c.JSON(http.StatusOK, SetupProgressResponse{
		OverallProgress: overallPct,
		IsComplete:      completedCount == len(steps),
		CompletedSteps:  completedCount,
		TotalSteps:      len(steps),
		Steps:           steps,
	})
}
