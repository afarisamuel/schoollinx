package handler

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"github.com/user/high-school-management/backend/internal/infrastructure/mailer"
	"github.com/user/high-school-management/backend/pkg/encryption"
	"github.com/user/high-school-management/backend/pkg/utils"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type AuthHandler struct {
	userRepo      domain.UserRepository
	tenantRepo    domain.TenantRepository
	blacklistRepo domain.TokenBlacklistRepository
	auditUC       domain.AuditUseCase
	cfg           *config.Config
	mailer        mailer.MailService
	smsProvider   domain.SMSProvider
	db            *gorm.DB
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type RequestOTPRequest struct {
	PhoneNumber string `json:"phone_number" binding:"required"`
}

type VerifyOTPRequest struct {
	PhoneNumber string `json:"phone_number" binding:"required"`
	OTP         string `json:"otp" binding:"required"`
}

type SignupRequest struct {
	Email       string      `json:"email" binding:"required,email"`
	Username    string      `json:"username" binding:"required"`
	PhoneNumber string      `json:"phone_number"`
	Password    string      `json:"password" binding:"required,min=6"`
	Role        domain.Role `json:"role" binding:"required"`
}

type SetupPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func NewAuthHandler(r *gin.RouterGroup, userRepo domain.UserRepository, tenantRepo domain.TenantRepository, blacklistRepo domain.TokenBlacklistRepository, auditUC domain.AuditUseCase, mailService mailer.MailService, smsProvider domain.SMSProvider, db *gorm.DB, cfg *config.Config) {
	h := &AuthHandler{
		userRepo:      userRepo,
		tenantRepo:    tenantRepo,
		blacklistRepo: blacklistRepo,
		auditUC:       auditUC,
		mailer:        mailService,
		smsProvider:   smsProvider,
		db:            db,
		cfg:           cfg,
	}

	limiter := middleware.NewRateLimiter(5, 10).Middleware()

	r.POST("/login", limiter, h.Login)
	r.POST("/signup", limiter, h.Signup)
	r.POST("/otp/request", limiter, h.RequestOTP)
	r.POST("/otp/verify", limiter, h.VerifyOTP)

	// Strict limiter for setup token to prevent brute forcing
	setupLimiter := middleware.NewRateLimiter(5, 5).Middleware()
	r.POST("/setup-password", setupLimiter, h.SetupPassword)
	r.POST("/forgot-password", limiter, h.ForgotPassword)
	r.POST("/reset-password", setupLimiter, h.ResetPassword)

	// Protected endpoints for token management
	authGroup := r.Group("/")
	authGroup.Use(middleware.AuthMiddleware(cfg, blacklistRepo))
	{
		authGroup.POST("/logout", h.Logout)
		authGroup.POST("/refresh", h.Refresh)
		authGroup.POST("/change-password", h.ChangePassword)
		
		// 2FA Setup
		authGroup.POST("/2fa/setup", h.Setup2FA)
		authGroup.POST("/2fa/verify", h.Verify2FA)
	}

	r.POST("/2fa/login", limiter, h.Login2FA)
}

// validatePassword enforces password complexity rules
func validatePassword(password string) bool {
	if len(password) < 8 {
		return false
	}
	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false
	for _, char := range password {
		switch {
		case 'a' <= char && char <= 'z':
			hasLower = true
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case '0' <= char && char <= '9':
			hasNumber = true
		default:
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasNumber && hasSpecial
}

// @Summary      Register a new user
// @Description  Creates a new user account with the specified role.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      SignupRequest  true  "Signup details"
// @Success      201      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auth/signup [post]
func (h *AuthHandler) Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration data: " + err.Error()})
		return
	}

	// Prevent public signup for admin roles
	if req.Role == domain.RoleEcopowerAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Registration with administrative roles is not permitted"})
		logger.Info("Registration with administrative roles is not permitted")
		// return
	}

	if !validatePassword(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	user := &domain.User{
		Email:    encryption.DeterministicEncryptedString(req.Email),
		Password: hashedPassword,
		Role:     req.Role,
	}

	if req.Username != "" {
		un := encryption.DeterministicEncryptedString(req.Username)
		user.Username = &un
	}

	if req.PhoneNumber != "" {
		pn := encryption.DeterministicEncryptedString(req.PhoneNumber)
		user.PhoneNumber = &pn
	}

	if err := h.userRepo.Create(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	// Generate token for immediate login
	token, err := utils.GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User created but failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"token":   token,
		"user":    user,
	})
}

// @Summary      Authenticate user and returns JWT
// @Description  Allows users (Admin, Teacher, Student, Guardian) to log in with their credentials.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      LoginRequest  true  "Login credentials"
// @Success      200      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]string
// @Failure      401      {object}  map[string]string
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByIdentifier(c.Request.Context(), req.Identifier)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if user.TwoFactorEnabled {
		// Return a temporary 2FA token
		token, err := utils.Generate2FAToken(user, h.cfg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"token":        token, // Short-lived token for 2FA completion
		})
		return
	}

	token, err := utils.GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Echo back the tenant subdomain so the frontend can cache it for
	// subsequent API requests (needed when running on localhost with no subdomain).
	tenantSubdomain, _ := c.Get("tenantSubdomain")

	c.JSON(http.StatusOK, gin.H{
		"token":                token,
		"user":                 user,
		"must_change_password": user.MustChangePassword,
		"requires_2fa":         false,
		"tenant_subdomain":     tenantSubdomain,
	})
}

// 2FA Endpoints

func (h *AuthHandler) Setup2FA(c *gin.Context) {
	claimsRaw, exists := c.Get(string(middleware.UserClaimsKey))
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsRaw.(*utils.Claims)

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	if user.TwoFactorEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA is already enabled"})
		return
	}

	// Determine AccountName for Authenticator App
	accountName := user.ID.String()
	decryptedEmail, err := encryption.DecryptDeterministic(string(user.Email), "")
	if err == nil && decryptedEmail != "" {
		accountName = decryptedEmail
	}

	// Generate a new OTP secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "School Management System",
		AccountName: accountName,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate 2FA secret"})
		return
	}

	// Save secret (totp uses base32 string format natively)
	encryptedSecret := encryption.DeterministicEncryptedString(key.Secret())
	user.TwoFactorSecret = &encryptedSecret
	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save 2FA secret"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"secret":   key.Secret(),
		"url":      key.URL(),
	})
}

type Verify2FARequest struct {
	Token string `json:"token" binding:"required"`
}

func (h *AuthHandler) Verify2FA(c *gin.Context) {
	claimsRaw, exists := c.Get(string(middleware.UserClaimsKey))
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsRaw.(*utils.Claims)

	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil || user.TwoFactorSecret == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user or 2FA secret not found"})
		return
	}


	valid := totp.Validate(req.Token, string(*user.TwoFactorSecret))
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid 2FA token"})
		return
	}

	user.TwoFactorEnabled = true
	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable 2FA"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "2FA successfully enabled"})
}

func (h *AuthHandler) Login2FA(c *gin.Context) {
	// Require the short-lived token via Authorization header
	tokenString := middleware.ExtractToken(c.Request)
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing 2FA pending token"})
		return
	}

	claims, err := utils.ValidateToken(tokenString, h.cfg)
	if err != nil || !claims.TwoFactorPending {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired 2FA pending token"})
		return
	}

	var req Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil || user.TwoFactorSecret == nil || !user.TwoFactorEnabled {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user state for 2FA"})
		return
	}


	valid := totp.Validate(req.Token, string(*user.TwoFactorSecret))
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid 2FA token"})
		return
	}

	// Generate full token
	token, err := utils.GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":                token,
		"user":                 user,
		"must_change_password": user.MustChangePassword,
		"requires_2fa":         false,
	})
}

// @Summary      Complete admin account setup
// @Description  Sets the initial password for a new admin using a setup token.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      SetupPasswordRequest  true  "Setup details"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      401      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auth/setup-password [post]
func (h *AuthHandler) SetupPassword(c *gin.Context) {
	var req SetupPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// 1. Attempt to find the user in the CURRENT context (Subdomain based)
	logger.Info("Passive lookup for token", zap.String("token", req.Token))
	user, err := h.userRepo.GetBySetupToken(c.Request.Context(), req.Token)

	// 2. FALLBACK: If not found, try Federated Search to "Self-Heal" the context
	if err != nil {
		logger.Info("Token not found in current context. Triggering Federated Global Search...")
		tenant, tErr := h.tenantRepo.GetBySetupToken(c.Request.Context(), req.Token)
		if tErr == nil && tenant != nil {
			logger.Info("Federated Search SUCCESS", zap.String("tenant", tenant.Name), zap.String("schema", tenant.SchemaName))
			// Found the tenant! Inject context so subsequent user lookup succeeds
			c.Set(string(middleware.TenantIDKey), tenant.ID)
			c.Set(string(middleware.TenantSchemaKey), tenant.SchemaName)

			ctx := context.WithValue(c.Request.Context(), middleware.TenantIDKey, tenant.ID)
			ctx = context.WithValue(ctx, middleware.TenantSchemaKey, tenant.SchemaName)
			c.Request = c.Request.WithContext(ctx)

			// Retry user lookup with the now-fixed context
			user, err = h.userRepo.GetBySetupToken(c.Request.Context(), req.Token)
		} else {
			logger.Info("Federated Search FAILED. Token is globally unknown.")
		}
	}

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired setup token"})
		return
	}

	if user.SetupTokenExpiresAt != nil && user.SetupTokenExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Setup token has expired"})
		return
	}

	if !validatePassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."})
		return
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	user.Password = hashedPassword
	user.SetupToken = nil
	user.SetupTokenExpiresAt = nil

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user: " + err.Error()})
		return
	}

	// 3. Log the successful setup in the Security Ledger
	h.auditUC.Log(c.Request.Context(), &domain.AuditLog{
		UserID:     user.ID,
		UserEmail:  string(user.Email),
		Action:     domain.ActionUpdate,
		EntityType: "USER_SETUP",
		EntityID:   user.ID.String(),
		Changes:    "Initial password set via onboarding setup link.",
		IPAddress:  c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Password set successfully. You can now log in."})
}

// @Summary      Logout
// @Description  Revokes the current JWT
// @Tags         auth
// @Produce      json
// @Success      200      {object}  map[string]string
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	tokenJTI, exists := c.Get("jti")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	tokenExp, exists := c.Get("exp")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	jti := tokenJTI.(string)
	expTime := tokenExp.(time.Time)

	if err := h.blacklistRepo.RevokeToken(c.Request.Context(), jti, expTime); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// @Summary      Refresh Token
// @Description  Issues a new JWT if the current one is valid
// @Tags         auth
// @Produce      json
// @Success      200      {object}  map[string]interface{}
// @Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userIDVal.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Invalidate the old token
	if tokenJTI, exists := c.Get("jti"); exists {
		if tokenExp, exists := c.Get("exp"); exists {
			_ = h.blacklistRepo.RevokeToken(c.Request.Context(), tokenJTI.(string), tokenExp.(time.Time))
		}
	}

	// Generate a new token
	token, err := utils.GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate new token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
	})
}

// @Summary      Change Password
// @Description  Allows logged-in users to change their password
// @Tags         auth
// @Produce      json
// @Success      200      {object}  map[string]string
// @Router       /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userIDVal.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if !utils.CheckPasswordHash(req.OldPassword, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid old password"})
		return
	}

	if !validatePassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."})
		return
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	user.Password = hashedPassword
	user.MustChangePassword = false

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user: " + err.Error()})
		return
	}

	h.auditUC.Log(c.Request.Context(), &domain.AuditLog{
		UserID:     user.ID,
		UserEmail:  string(user.Email),
		Action:     domain.ActionUpdate,
		EntityType: "USER_PASSWORD",
		EntityID:   user.ID.String(),
		Changes:    "User changed password",
		IPAddress:  c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// @Summary      Forgot Password
// @Description  Requests a password reset link to be sent via email
// @Tags         auth
// @Produce      json
// @Success      200      {object}  map[string]string
// @Router       /auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByIdentifier(c.Request.Context(), req.Email)
	if err != nil {
		// Silent fail to prevent email enumeration
		c.JSON(http.StatusOK, gin.H{"message": "If an account with that email exists, a password reset link has been sent."})
		return
	}

	token := uuid.New().String()
	expiresAt := time.Now().Add(1 * time.Hour)

	user.ResetToken = &token
	user.ResetTokenExpiresAt = &expiresAt

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	var resetLink string
	tenantSubdomain, exists := c.Get("tenantSubdomain")
	if exists && tenantSubdomain != "" {
		// Tenant portal
		resetLink = "https://" + tenantSubdomain.(string) + ".schoollinx.com/reset-password?token=" + token
	} else {
		// Admin portal
		resetLink = "https://admin.schoollinx.com/reset-password?token=" + token
	}

	subject := "Reset Your Password - School Linx"
	htmlBody := "<h1>Password Reset Request</h1><p>You requested a password reset. Click the link below to set a new password:</p><p><a href=\"" + resetLink + "\">Reset Password</a></p><p>This link will expire in 1 hour.</p>"

	decryptedEmail, err := encryption.DecryptDeterministic(string(user.Email), "")
	if err == nil && decryptedEmail != "" {
		go func() {
			if h.mailer != nil {
				h.mailer.SendBulkHTML(context.Background(), subject, htmlBody, []string{decryptedEmail})
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "If an account with that email exists, a password reset link has been sent."})
}

// @Summary      Reset Password
// @Description  Sets a new password using a reset token
// @Tags         auth
// @Produce      json
// @Success      200      {object}  map[string]string
// @Router       /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.GetByResetToken(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	if user.ResetTokenExpiresAt != nil && user.ResetTokenExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Reset token has expired"})
		return
	}

	if !validatePassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."})
		return
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	user.Password = hashedPassword
	user.ResetToken = nil
	user.ResetTokenExpiresAt = nil
	user.MustChangePassword = false

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	h.auditUC.Log(c.Request.Context(), &domain.AuditLog{
		UserID:     user.ID,
		UserEmail:  string(user.Email),
		Action:     domain.ActionUpdate,
		EntityType: "USER_PASSWORD",
		EntityID:   user.ID.String(),
		Changes:    "Password reset via email token",
		IPAddress:  c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Password has been reset successfully. You can now log in."})
}

// normalizePhoneCandidates generates common format variants for a given phone number
func normalizePhoneCandidates(phone string) []string {
	cleaned := strings.Map(func(r rune) rune {
		if (r >= '0' && r <= '9') || r == '+' {
			return r
		}
		return -1
	}, strings.TrimSpace(phone))

	if cleaned == "" {
		return nil
	}

	candidates := []string{strings.TrimSpace(phone), cleaned}
	digitsOnly := strings.TrimPrefix(cleaned, "+")
	candidates = append(candidates, digitsOnly)

	// Ghana specific formatting (e.g. 0244123456 <-> 233244123456 <-> +233244123456)
	if strings.HasPrefix(cleaned, "+233") && len(cleaned) == 13 {
		local := "0" + cleaned[4:]
		candidates = append(candidates, local, "233"+cleaned[4:])
	} else if strings.HasPrefix(cleaned, "233") && len(cleaned) == 12 {
		local := "0" + cleaned[3:]
		candidates = append(candidates, local, "+"+cleaned)
	} else if strings.HasPrefix(cleaned, "0") && len(cleaned) == 10 {
		candidates = append(candidates, "+233"+cleaned[1:], "233"+cleaned[1:])
	}

	seen := make(map[string]bool)
	var result []string
	for _, c := range candidates {
		if c != "" && !seen[c] {
			seen[c] = true
			result = append(result, c)
		}
	}
	return result
}

func maskPhoneNumber(phone string) string {
	phone = strings.TrimSpace(phone)
	if len(phone) <= 4 {
		return "****"
	}
	return strings.Repeat("•", len(phone)-4) + " " + phone[len(phone)-4:]
}

func generateNumericOTP(length int) (string, error) {
	const digits = "0123456789"
	b := make([]byte, length)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		b[i] = digits[num.Int64()]
	}
	return string(b), nil
}

func (h *AuthHandler) findUserByPhoneCandidates(ctx context.Context, candidates []string) (*domain.User, string, error) {
	// 1. Direct match on users table
	for _, cand := range candidates {
		encPhone, err := encryption.EncryptDeterministic(cand, "")
		if err != nil {
			continue
		}
		var user domain.User
		if err := h.db.WithContext(ctx).Where("phone_number = ?", encPhone).First(&user).Error; err == nil {
			return &user, cand, nil
		}
	}

	// 2. Search teachers table
	for _, cand := range candidates {
		var teacher domain.Teacher
		encPhone, _ := encryption.EncryptDeterministic(cand, "")
		if err := h.db.WithContext(ctx).Where("phone_number = ? OR email = ?", encPhone, encPhone).First(&teacher).Error; err == nil && teacher.UserID != nil {
			var user domain.User
			if err := h.db.WithContext(ctx).First(&user, "id = ?", *teacher.UserID).Error; err == nil {
				encVal := encryption.DeterministicEncryptedString(cand)
				user.PhoneNumber = &encVal
				_ = h.db.WithContext(ctx).Save(&user)
				return &user, cand, nil
			}
		}
	}

	// 3. Search guardians table
	for _, cand := range candidates {
		var guardian domain.Guardian
		encPhone, _ := encryption.EncryptDeterministic(cand, "")
		if err := h.db.WithContext(ctx).Where("phone_number = ? OR email = ?", encPhone, encPhone).First(&guardian).Error; err == nil && guardian.UserID != uuid.Nil {
			var user domain.User
			if err := h.db.WithContext(ctx).First(&user, "id = ?", guardian.UserID).Error; err == nil {
				encVal := encryption.DeterministicEncryptedString(cand)
				user.PhoneNumber = &encVal
				_ = h.db.WithContext(ctx).Save(&user)
				return &user, cand, nil
			}
		}
	}

	// 4. Search students table
	for _, cand := range candidates {
		var student domain.Student
		encPhone, _ := encryption.EncryptDeterministic(cand, "")
		if err := h.db.WithContext(ctx).Where("emergency_contact_phone = ? OR phone_number = ? OR email = ?", encPhone, encPhone, encPhone).First(&student).Error; err == nil && student.UserID != nil {
			var user domain.User
			if err := h.db.WithContext(ctx).First(&user, "id = ?", *student.UserID).Error; err == nil {
				encVal := encryption.DeterministicEncryptedString(cand)
				user.PhoneNumber = &encVal
				_ = h.db.WithContext(ctx).Save(&user)
				return &user, cand, nil
			}
		}
	}

	return nil, "", errors.New("no user found matching phone number")
}

// @Summary      Request Phone OTP for Login
// @Description  Sends a 6-digit one-time password via SMS to the user's registered phone number
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      RequestOTPRequest  true  "Phone number"
// @Success      200      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auth/otp/request [post]
func (h *AuthHandler) RequestOTP(c *gin.Context) {
	var req RequestOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number is required"})
		return
	}

	candidates := normalizePhoneCandidates(req.PhoneNumber)
	if len(candidates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter a valid phone number"})
		return
	}

	user, matchedPhone, err := h.findUserByPhoneCandidates(c.Request.Context(), candidates)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No account found registered with this phone number. Please contact your school administrator."})
		return
	}

	otp, err := generateNumericOTP(6)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification code"})
		return
	}

	expiresAt := time.Now().Add(10 * time.Minute)
	user.OTPCode = &otp
	user.OTPExpiresAt = &expiresAt

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save verification code"})
		return
	}

	// Dispatch SMS
	senderID := "SchoolLinx"
	tenantSubdomain, exists := c.Get("tenantSubdomain")
	if exists && tenantSubdomain != "" {
		sub := tenantSubdomain.(string)
		if len(sub) > 0 && len(sub) <= 11 {
			senderID = sub
		}
	}

	smsMessage := fmt.Sprintf("Your School Linx verification code is: %s. Valid for 10 minutes. Do not share this code.", otp)
	recipient := matchedPhone
	if !strings.HasPrefix(recipient, "+") && strings.HasPrefix(recipient, "0") {
		recipient = "233" + recipient[1:]
	} else if strings.HasPrefix(recipient, "+") {
		recipient = strings.TrimPrefix(recipient, "+")
	}

	go func() {
		if h.smsProvider != nil {
			_ = h.smsProvider.SendSMS(context.Background(), senderID, []string{recipient}, smsMessage)
		} else {
			logger.Info("Sandbox SMS OTP Dispatch", zap.String("recipient", recipient), zap.String("otp", otp))
		}
	}()

	logger.Info("OTP generated for phone login", zap.String("recipient", recipient), zap.String("masked", maskPhoneNumber(req.PhoneNumber)))

	c.JSON(http.StatusOK, gin.H{
		"message":      "Verification code sent successfully",
		"phone_masked": maskPhoneNumber(req.PhoneNumber),
		"expires_in":   600,
	})
}

// @Summary      Verify Phone OTP and Login
// @Description  Verifies the SMS OTP and returns a JWT authentication session
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      VerifyOTPRequest  true  "Phone and OTP"
// @Success      200      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]string
// @Failure      401      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auth/otp/verify [post]
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number and verification code are required"})
		return
	}

	candidates := normalizePhoneCandidates(req.PhoneNumber)
	if len(candidates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number"})
		return
	}

	user, _, err := h.findUserByPhoneCandidates(c.Request.Context(), candidates)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid phone number or verification code"})
		return
	}

	if user.OTPCode == nil || *user.OTPCode != req.OTP {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid verification code. Please check and try again."})
		return
	}

	if user.OTPExpiresAt == nil || user.OTPExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Verification code has expired. Please request a new code."})
		return
	}

	// Invalidate OTP so it cannot be re-used
	user.OTPCode = nil
	user.OTPExpiresAt = nil
	_ = h.userRepo.Update(c.Request.Context(), user)

	token, err := utils.GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
		return
	}

	// Log security ledger audit log
	h.auditUC.Log(c.Request.Context(), &domain.AuditLog{
		UserID:     user.ID,
		UserEmail:  string(user.Email),
		Action:     domain.ActionCreate,
		EntityType: "USER_AUTH",
		EntityID:   user.ID.String(),
		Changes:    "User logged in via Phone Number & SMS OTP",
		IPAddress:  c.ClientIP(),
	})

	tenantSubdomain, _ := c.Get("tenantSubdomain")

	c.JSON(http.StatusOK, gin.H{
		"token":                token,
		"user":                 user,
		"must_change_password": user.MustChangePassword,
		"requires_2fa":         false,
		"tenant_subdomain":     tenantSubdomain,
	})
}

