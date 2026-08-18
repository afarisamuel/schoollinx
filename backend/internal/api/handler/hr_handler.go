package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type HRHandler struct {
	useCase domain.HRUseCase
}

func NewHRHandler(rg *gin.RouterGroup, useCase domain.HRUseCase) *HRHandler {
	h := &HRHandler{useCase: useCase}

	hrGroup := rg.Group("/hr")
	{
		// Staff
		hrGroup.POST("/staff", h.CreateStaffProfile)
		hrGroup.GET("/staff", h.GetStaffProfiles)
		hrGroup.PUT("/staff/:id", h.UpdateStaffProfile)
		hrGroup.DELETE("/staff/:id", h.DeleteStaffProfile)

		// Payroll
		hrGroup.POST("/payroll/process", h.GenerateMonthlyPayroll)
		hrGroup.GET("/payroll", h.GetPayrollHistory)
		hrGroup.PATCH("/payroll/:id/paid", h.MarkPayrollPaid)
		hrGroup.GET("/payroll/:id/payslip", h.DownloadPayslip)

		// Leave
		hrGroup.POST("/leave", h.SubmitLeaveRequest)
		hrGroup.GET("/leave", h.GetLeaveRequests)
		hrGroup.PATCH("/leave/:id/status", h.UpdateLeaveStatus)

		// Deductions
		hrGroup.POST("/deductions", h.CreateDeductionType)
		hrGroup.GET("/deductions", h.GetDeductionTypes)
		hrGroup.PUT("/deductions/:id", h.UpdateDeductionType)
		hrGroup.DELETE("/deductions/:id", h.DeleteDeductionType)

		// Allowances
		hrGroup.POST("/allowances", h.CreateAllowanceType)
		hrGroup.GET("/allowances", h.GetAllowanceTypes)
		hrGroup.PUT("/allowances/:id", h.UpdateAllowanceType)
		hrGroup.DELETE("/allowances/:id", h.DeleteAllowanceType)

		// Tax Brackets
		hrGroup.POST("/tax-brackets", h.CreateTaxBracket)
		hrGroup.GET("/tax-brackets", h.GetTaxBrackets)
		hrGroup.PUT("/tax-brackets/:id", h.UpdateTaxBracket)
		hrGroup.DELETE("/tax-brackets/:id", h.DeleteTaxBracket)

		// Leave Balances
		hrGroup.POST("/leave/balances", h.AllocateLeaveBalance)
		hrGroup.GET("/leave/balances", h.GetAllLeaveBalances)
		hrGroup.GET("/leave/balances/:staffId", h.GetStaffLeaveBalances)

		// Performance Reviews
		hrGroup.POST("/performance", h.SubmitPerformanceReview)
		hrGroup.GET("/performance", h.GetAllPerformanceReviews)
		hrGroup.GET("/performance/:staffId", h.GetPerformanceReviews)
		hrGroup.PUT("/performance/:id", h.UpdatePerformanceReview)

		// Professional Development
		hrGroup.POST("/development", h.LogProfessionalDevelopment)
		hrGroup.GET("/development/:staffId", h.GetProfessionalDevelopment)

		// Attendance
		hrGroup.POST("/attendance/clock-in", h.ClockIn)
		hrGroup.POST("/attendance/clock-out", h.ClockOut)
		hrGroup.GET("/attendance", h.GetAttendanceLogs)
		hrGroup.GET("/attendance/:staffId", h.GetStaffAttendanceLogs)

		// Onboarding
		hrGroup.GET("/onboarding/:staffId", h.GetOnboardingChecklist)
		hrGroup.PUT("/onboarding/:staffId", h.UpdateOnboardingChecklist)
	}

	return h
}

// Staff
func (h *HRHandler) CreateStaffProfile(c *gin.Context) {
	var req domain.StaffProfile
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if err := h.useCase.CreateStaffProfile(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetStaffProfiles(c *gin.Context) {
	staff, err := h.useCase.GetStaffProfiles(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, staff)
}

func (h *HRHandler) UpdateStaffProfile(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req domain.StaffProfile
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if err := h.useCase.UpdateStaffProfile(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (h *HRHandler) DeleteStaffProfile(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeleteStaffProfile(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Payroll
func (h *HRHandler) GenerateMonthlyPayroll(c *gin.Context) {
	month, _ := strconv.Atoi(c.Query("month"))
	year, _ := strconv.Atoi(c.Query("year"))

	if month == 0 || year == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month and year queries required"})
		return
	}

	payroll, err := h.useCase.GenerateMonthlyPayroll(c.Request.Context(), month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, payroll)
}

func (h *HRHandler) GetPayrollHistory(c *gin.Context) {
	month, _ := strconv.Atoi(c.Query("month"))
	year, _ := strconv.Atoi(c.Query("year"))

	payroll, err := h.useCase.GetPayrollHistory(c.Request.Context(), month, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payroll)
}

func (h *HRHandler) MarkPayrollPaid(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.MarkPayrollPaid(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Payroll marked as paid"})
}

func (h *HRHandler) DownloadPayslip(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	pr, pdfBytes, err := h.useCase.GeneratePayslip(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", pr.StaffID.String()[:8], pr.PeriodMonth, pr.PeriodYear)
	
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// Leave
func (h *HRHandler) SubmitLeaveRequest(c *gin.Context) {
	var req domain.LeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.SubmitLeaveRequest(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetLeaveRequests(c *gin.Context) {
	leaves, err := h.useCase.GetLeaveRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, leaves)
}

func (h *HRHandler) UpdateLeaveStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req struct {
		Status domain.LeaveStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	if err := h.useCase.ApproveRejectLeave(c.Request.Context(), id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Leave status updated"})
}

// Leave Balances
func (h *HRHandler) AllocateLeaveBalance(c *gin.Context) {
	var req domain.LeaveBalance
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.AllocateLeaveBalance(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetAllLeaveBalances(c *gin.Context) {
	yearStr := c.Query("year")
	if yearStr == "" {
		yearStr = "2026" // Default to current year or dynamic
	}
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
		return
	}

	balances, err := h.useCase.GetAllLeaveBalances(c.Request.Context(), year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, balances)
}

func (h *HRHandler) GetStaffLeaveBalances(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	yearStr := c.Query("year")
	if yearStr == "" {
		yearStr = "2026"
	}
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
		return
	}

	balances, err := h.useCase.GetStaffLeaveBalances(c.Request.Context(), staffID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, balances)
}

// Deductions
func (h *HRHandler) CreateDeductionType(c *gin.Context) {
	var req domain.DeductionType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.CreateDeductionType(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetDeductionTypes(c *gin.Context) {
	types, err := h.useCase.GetDeductionTypes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *HRHandler) UpdateDeductionType(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req domain.DeductionType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.UpdateDeductionType(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (h *HRHandler) DeleteDeductionType(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeleteDeductionType(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Allowances
func (h *HRHandler) CreateAllowanceType(c *gin.Context) {
	var req domain.AllowanceType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.CreateAllowanceType(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetAllowanceTypes(c *gin.Context) {
	types, err := h.useCase.GetAllowanceTypes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *HRHandler) UpdateAllowanceType(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req domain.AllowanceType
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.UpdateAllowanceType(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (h *HRHandler) DeleteAllowanceType(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeleteAllowanceType(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Tax Brackets
func (h *HRHandler) CreateTaxBracket(c *gin.Context) {
	var req domain.TaxBracket
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.CreateTaxBracket(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetTaxBrackets(c *gin.Context) {
	types, err := h.useCase.GetTaxBrackets(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *HRHandler) UpdateTaxBracket(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req domain.TaxBracket
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.UpdateTaxBracket(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (h *HRHandler) DeleteTaxBracket(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	if err := h.useCase.DeleteTaxBracket(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Performance Reviews
func (h *HRHandler) SubmitPerformanceReview(c *gin.Context) {
	var req domain.PerformanceReview
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if err := h.useCase.SubmitPerformanceReview(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetPerformanceReviews(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	reviews, err := h.useCase.GetStaffPerformanceReviews(c.Request.Context(), staffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reviews)
}

func (h *HRHandler) GetAllPerformanceReviews(c *gin.Context) {
	reviews, err := h.useCase.GetAllPerformanceReviews(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reviews)
}

func (h *HRHandler) UpdatePerformanceReview(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req domain.PerformanceReview
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.useCase.UpdatePerformanceReview(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

// Professional Development
func (h *HRHandler) LogProfessionalDevelopment(c *gin.Context) {
	var req domain.ProfessionalDevelopment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if err := h.useCase.LogProfessionalDevelopment(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *HRHandler) GetProfessionalDevelopment(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	pds, err := h.useCase.GetStaffProfessionalDevelopment(c.Request.Context(), staffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pds)
}

// Attendance Handlers
func (h *HRHandler) ClockIn(c *gin.Context) {
	var req struct {
		StaffID     uuid.UUID `json:"staff_id"`
		IsBiometric bool      `json:"is_biometric"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	record, err := h.useCase.ClockIn(c.Request.Context(), req.StaffID, req.IsBiometric)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, record)
}

func (h *HRHandler) ClockOut(c *gin.Context) {
	var req struct {
		StaffID     uuid.UUID `json:"staff_id"`
		IsBiometric bool      `json:"is_biometric"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	record, err := h.useCase.ClockOut(c.Request.Context(), req.StaffID, req.IsBiometric)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, record)
}

func (h *HRHandler) GetAttendanceLogs(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return
	}

	logs, err := h.useCase.GetAttendanceLogs(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *HRHandler) GetStaffAttendanceLogs(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return
	}

	logs, err := h.useCase.GetStaffAttendanceLogs(c.Request.Context(), staffID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// Onboarding
func (h *HRHandler) GetOnboardingChecklist(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}
	checklist, err := h.useCase.GetOnboardingChecklist(c.Request.Context(), staffID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Onboarding checklist not found"})
		return
	}
	c.JSON(http.StatusOK, checklist)
}

func (h *HRHandler) UpdateOnboardingChecklist(c *gin.Context) {
	staffID, err := uuid.Parse(c.Param("staffId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}
	var req domain.OnboardingChecklist
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.useCase.UpdateOnboardingStatus(c.Request.Context(), staffID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Onboarding checklist updated"})
}
