package handler

import (
	"fmt"
	"io"
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
		api.GET("/family-ledger", h.GetMyFamilyLedger)
		api.GET("/pickup-pass", h.GetMyPickupPass)
		api.POST("/pickup-pass/otp", h.GeneratePickupOTP)
		api.GET("/absence-requests", h.GetMyAbsenceRequests)
		api.POST("/absence-requests", h.SubmitAbsenceRequest)
	}

	// Routes for Admins and Teachers to manage guardians
	adminApi := r.Group("/guardians")
	adminApi.Use(middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleTeacher))
	{
		adminApi.GET("", h.GetAllGuardians)
		adminApi.GET("/profile", h.GetProfile) // fallback compatibility
		adminApi.POST("/verify-pickup-otp", h.VerifyPickupOTP)
		adminApi.GET("/absence-requests", h.GetAllAbsenceRequests)
		adminApi.POST("/absence-requests/:id/review", h.ReviewAbsenceRequest)
		adminApi.POST("/import", h.ImportGuardians)
		adminApi.GET("/import/template", h.GetImportTemplate)
		adminApi.POST("/send-invites", h.SendPortalInvites)
		adminApi.GET("/verify-pickup/:code", h.VerifyPickupCode)
		adminApi.GET("/:id", h.GetGuardianByID)
		adminApi.GET("/:id/family-ledger", h.GetFamilyLedgerByID)
		adminApi.POST("", h.CreateGuardian)
		adminApi.PUT("/:id", h.UpdateGuardian)
		adminApi.DELETE("/:id", h.DeleteGuardian)
		adminApi.POST("/:id/students", h.LinkStudent)
		adminApi.DELETE("/:id/students/:student_id", h.UnlinkStudent)
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

func (h *GuardianHandler) GetAllGuardians(c *gin.Context) {
	guardians, err := h.guardianUseCase.GetAllGuardians(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve guardians"})
		return
	}
	c.JSON(http.StatusOK, guardians)
}

func (h *GuardianHandler) GetGuardianByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	guardian, err := h.guardianUseCase.GetGuardianByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guardian not found"})
		return
	}

	c.JSON(http.StatusOK, guardian)
}

func (h *GuardianHandler) CreateGuardian(c *gin.Context) {
	var req domain.Guardian
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tempPassword, err := h.guardianUseCase.CreateGuardian(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"guardian":      req,
		"temp_password": tempPassword,
	})
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

func (h *GuardianHandler) DeleteGuardian(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	if err := h.guardianUseCase.DeleteGuardian(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete guardian"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Guardian deleted successfully"})
}

func (h *GuardianHandler) LinkStudent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	var req struct {
		StudentID uuid.UUID `json:"student_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid student_id is required"})
		return
	}

	if err := h.guardianUseCase.LinkStudent(c.Request.Context(), id, req.StudentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student linked successfully"})
}

func (h *GuardianHandler) UnlinkStudent(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	if err := h.guardianUseCase.UnlinkStudent(c.Request.Context(), id, studentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student unlinked successfully"})
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

func (h *GuardianHandler) GetMyFamilyLedger(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	summary, err := h.guardianUseCase.GetFamilyLedger(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (h *GuardianHandler) GetFamilyLedgerByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID format"})
		return
	}

	summary, err := h.guardianUseCase.GetFamilyLedger(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (h *GuardianHandler) GetMyPickupPass(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	guardian, err := h.guardianUseCase.GetGuardianProfile(c.Request.Context(), userID.(uuid.UUID))
	if err != nil || guardian == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guardian profile not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"guardian_id":   guardian.ID,
		"guardian_name": fmt.Sprintf("%s %s", string(guardian.FirstName), string(guardian.LastName)),
		"relationship":  guardian.Relationship,
		"can_pickup":    guardian.CanPickup,
		"pickup_code":   guardian.PickupCode,
		"students":      guardian.Students,
	})
}

func (h *GuardianHandler) VerifyPickupCode(c *gin.Context) {
	code := c.Param("code")
	guardian, err := h.guardianUseCase.VerifyPickupPass(c.Request.Context(), code)
	if err != nil || guardian == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired pickup authorization code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":         true,
		"guardian_name": fmt.Sprintf("%s %s", string(guardian.FirstName), string(guardian.LastName)),
		"phone_number":  string(guardian.PhoneNumber),
		"relationship":  guardian.Relationship,
		"can_pickup":    guardian.CanPickup,
		"students":      guardian.Students,
	})
}

func (h *GuardianHandler) GetMyAbsenceRequests(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	requests, err := h.guardianUseCase.GetAbsenceRequestsForGuardian(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *GuardianHandler) SubmitAbsenceRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req domain.AbsenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.guardianUseCase.SubmitAbsenceRequest(c.Request.Context(), userID.(uuid.UUID), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *GuardianHandler) GetAllAbsenceRequests(c *gin.Context) {
	requests, err := h.guardianUseCase.GetAllAbsenceRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *GuardianHandler) ReviewAbsenceRequest(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	reviewerID, _ := c.Get("userID")
	var rID uuid.UUID
	if reviewerID != nil {
		rID = reviewerID.(uuid.UUID)
	}

	var body struct {
		Status domain.AbsenceStatus `json:"status" binding:"required"`
		Notes  string               `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.guardianUseCase.ReviewAbsenceRequest(c.Request.Context(), id, rID, body.Status, body.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Absence request status updated successfully"})
}

func (h *GuardianHandler) ImportGuardians(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV file is required in 'file' form field"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file data"})
		return
	}

	imported, skipped, err := h.guardianUseCase.BulkImportGuardians(c.Request.Context(), data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Guardian import completed",
		"imported": imported,
		"skipped":  skipped,
	})
}

func (h *GuardianHandler) GetImportTemplate(c *gin.Context) {
	csvContent := "first_name,last_name,phone_number,email,relationship,student_enrollment_num\n" +
		"Kofi,Mensah,0244123456,kofi.mensah@example.com,Father,SCH-2026-001\n" +
		"Ama,Osei,0501987654,ama.osei@example.com,Mother,SCH-2026-002\n"

	c.Header("Content-Disposition", "attachment; filename=guardians_import_template.csv")
	c.Header("Content-Type", "text/csv")
	c.String(http.StatusOK, csvContent)
}

func (h *GuardianHandler) SendPortalInvites(c *gin.Context) {
	sent, err := h.guardianUseCase.SendPortalInvites(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Sent %d portal onboarding invitations successfully", sent),
		"count":   sent,
	})
}

func (h *GuardianHandler) GeneratePickupOTP(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		StudentID      uuid.UUID `json:"student_id" binding:"required"`
		CollectorName  string    `json:"collector_name" binding:"required"`
		CollectorPhone string    `json:"collector_phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	otp, err := h.guardianUseCase.GeneratePickupOTP(c.Request.Context(), userID, req.StudentID, req.CollectorName, req.CollectorPhone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, otp)
}

func (h *GuardianHandler) VerifyPickupOTP(c *gin.Context) {
	var req struct {
		OTP string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OTP is required"})
		return
	}

	otp, err := h.guardianUseCase.VerifyAndRedeemPickupOTP(c.Request.Context(), req.OTP)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":          true,
		"message":        "Gate pass verified. Child pickup authorized.",
		"collector_name": otp.CollectorName,
		"student_id":     otp.StudentID,
		"used_at":        otp.UsedAt,
	})
}
