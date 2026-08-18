package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

type GuardianHandler struct {
	guardianUseCase domain.GuardianUseCase
	academicUseCase domain.AcademicUseCase
}

func NewGuardianHandler(r *gin.RouterGroup, guc domain.GuardianUseCase, auc domain.AcademicUseCase) {
	h := &GuardianHandler{
		guardianUseCase: guc,
		academicUseCase: auc,
	}

	// Strictly restricted to GUARDIAN role
	api := r.Group("/guardian")
	api.Use(middleware.RoleMiddleware(domain.RoleGuardian))
	{
		api.GET("/profile", h.GetProfile)
		api.GET("/children", h.GetChildren)
		api.GET("/child/:student_id/academics", h.GetChildAcademics)
	}

	// Routes for Admins and Teachers to manage guardians
	adminApi := r.Group("/guardians")
	adminApi.Use(middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher))
	{
		adminApi.POST("", h.CreateGuardian)
		adminApi.PUT("/:id", h.UpdateGuardian)
		adminApi.POST("/:id/reset-password", h.ResetPassword)
	}
}

func (h *GuardianHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	profile, err := h.guardianUseCase.GetGuardianProfile(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guardian profile not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *GuardianHandler) GetChildren(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	children, err := h.guardianUseCase.GetChildren(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve linked children"})
		return
	}

	c.JSON(http.StatusOK, children)
}

func (h *GuardianHandler) GetChildAcademics(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	// Security Verification: Ensure the requested student is actually linked to this guardian
	children, err := h.guardianUseCase.GetChildren(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Authorization check failed"})
		return
	}

	isAuthorized := false
	for _, child := range children {
		if child.ID == studentID {
			isAuthorized = true
			break
		}
	}

	if !isAuthorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: You are not authorized to view this student's records."})
		return
	}

	// If authorized, retrieve academic insights
	insights, err := h.academicUseCase.GetStudentInsights(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve academic insights"})
		return
	}

	c.JSON(http.StatusOK, insights)
}

func (h *GuardianHandler) CreateGuardian(c *gin.Context) {
	var req domain.Guardian
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.guardianUseCase.CreateGuardian(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guardian"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *GuardianHandler) UpdateGuardian(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	var req domain.Guardian
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id

	if err := h.guardianUseCase.UpdateGuardian(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update guardian"})
		return
	}

	c.JSON(http.StatusOK, req)
}

func (h *GuardianHandler) ResetPassword(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID format"})
		return
	}

	newPassword, err := h.guardianUseCase.ResetPassword(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Password reset successfully. A notification email has been sent.",
		"password": newPassword,
	})
}
