package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type FiscalHandler struct {
	fiscalUseCase domain.FiscalUseCase
}

func NewFiscalHandler(r *gin.RouterGroup, fuc domain.FiscalUseCase) {
	h := &FiscalHandler{fiscalUseCase: fuc}

	g := r.Group("/fiscal")
	{
		g.GET("/records", h.ListAllRecords)
		g.GET("/students/:id", h.GetStudentFiscalStatus)
		g.POST("/records", h.CreateFee)
		g.POST("/records/:id/pay", h.ProcessPayment)
		g.POST("/records/:id/partial-pay", h.PartialPayment)
		g.GET("/records/:id/receipt", h.PrintReceipt)
		g.POST("/refresh-overdue", h.RefreshOverdue)
		g.GET("/summary", h.GetSummary)
		g.GET("/recommendations", h.GetRecommendations)
		g.POST("/structures", h.SetFeeStructure)
		g.GET("/structures/:period_id", h.GetFeeStructures)
		g.DELETE("/structures/:id", h.DeleteFeeStructure)
		g.POST("/generate-term-fees/:period_id", h.GenerateTermFees)
		g.GET("/defaulters", h.GetDefaulters)
		g.GET("/records/:id/invoice", h.GenerateInvoice)
		g.GET("/students/:id/bill/print", h.PrintBill)
		g.GET("/classes/:class_id/bills/print", h.PrintClassBills)
		
		// Wallet
		g.POST("/wallet/topup/:student_id", h.TopUpWallet)
		g.POST("/wallet/purchase/:student_id", h.PurchaseCanteen)
		g.GET("/wallet/:student_id", h.GetWalletInfo)

		// Budgets & Expenses
		g.POST("/budgets", h.CreateBudget)
		g.GET("/budgets", h.GetBudgets)
		g.POST("/expenditures", h.RecordExpenditure)
		g.POST("/expense-claims", h.SubmitExpenseClaim)
		g.GET("/expense-claims", h.GetExpenseClaims)
		g.POST("/expense-claims/:id/review", h.ReviewExpenseClaim)

		// Debt Ageing
		g.GET("/debt-ageing", h.GetDebtAgeing)

		// Scholarships
		g.POST("/scholarships", h.ApplyScholarship)
		g.GET("/scholarships/student/:student_id", h.GetScholarshipsByStudent)
		g.PATCH("/scholarships/:id/status", h.UpdateScholarshipStatus)

		// Year-End Rollover
		g.GET("/year-end/summary", h.GetYearEndSummary)
		g.POST("/year-end/rollover", h.PerformYearEndRollover)

		// Milestone 2: Installments, Sibling Discounts & Multi-Currency
		g.POST("/installments", h.CreateInstallmentAgreement)
		g.GET("/installments/student/:student_id", h.GetStudentInstallments)
		g.POST("/installments/milestones/:id/pay", h.PayInstallmentMilestone)
		g.GET("/installment-settings", h.GetInstallmentSettings)
		g.POST("/installment-settings", h.SaveInstallmentSettings)
		g.GET("/discounts/sibling/:student_id", h.CalculateSiblingDiscount)
		g.POST("/baseline-tuition", h.SetBaselineTuition)
		g.GET("/rates", h.GetExchangeRates)
		g.POST("/canteen/pos-charge", h.CanteenPOSCharge)
	}
}

type TopUpRequest struct {
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Description string  `json:"description"`
}

func (h *FiscalHandler) TopUpWallet(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	var req TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.TopUpWallet(c.Request.Context(), studentID, req.Amount, req.Description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wallet topped up successfully"})
}

func (h *FiscalHandler) PurchaseCanteen(c *gin.Context) {
	idStr := c.Param("student_id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required"`
		Item   string  `json:"item" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.ProcessCanteenPurchase(c.Request.Context(), id, req.Amount, req.Item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Purchase successful"})
}

func (h *FiscalHandler) GetWalletInfo(c *gin.Context) {
	idStr := c.Param("student_id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	balance, txns, err := h.fiscalUseCase.GetWalletInfo(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"balance":      balance,
		"transactions": txns,
	})
}

func (h *FiscalHandler) ListAllRecords(c *gin.Context) {
	records, err := h.fiscalUseCase.ListAllRecords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, records)
}

func (h *FiscalHandler) GetStudentFiscalStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	balance, prepaidBalance, records, err := h.fiscalUseCase.GetStudentBalance(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"balance":         balance,
		"prepaid_balance": prepaidBalance,
		"records":         records,
	})
}

func (h *FiscalHandler) PrintBill(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}

	pdfBytes, err := h.fiscalUseCase.GeneratePupilBill(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate bill: " + err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `inline; filename="pupil_bill.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func (h *FiscalHandler) PrintClassBills(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}

	pdfBytes, err := h.fiscalUseCase.GenerateClassBills(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate class bills: " + err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="class_bills.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}


func (h *FiscalHandler) CreateFee(c *gin.Context) {
	var record domain.FiscalRecord
	if err := c.ShouldBindJSON(&record); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.CreateFee(c.Request.Context(), &record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, record)
}

func (h *FiscalHandler) ProcessPayment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid record ID format"})
		return
	}
	if err := h.fiscalUseCase.ProcessPayment(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "paid"})
}

func (h *FiscalHandler) PartialPayment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid record ID format"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
		Note   string  `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.ProcessPartialPayment(c.Request.Context(), id, req.Amount, req.Note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "partial payment recorded"})
}

func (h *FiscalHandler) PrintReceipt(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid record ID format"})
		return
	}

	pdfBytes, err := h.fiscalUseCase.GeneratePaymentReceipt(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `inline; filename="payment_receipt.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}


func (h *FiscalHandler) RefreshOverdue(c *gin.Context) {
	if err := h.fiscalUseCase.UpdateOverdueRecords(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "overdue records updated"})
}

func (h *FiscalHandler) GetSummary(c *gin.Context) {
	summary, err := h.fiscalUseCase.GetSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *FiscalHandler) GetRecommendations(c *gin.Context) {
	recommendations, err := h.fiscalUseCase.GenerateRecommendations(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, recommendations)
}

func (h *FiscalHandler) SetFeeStructure(c *gin.Context) {
	var structure domain.FeeStructure
	if err := c.ShouldBindJSON(&structure); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.SetFeeStructure(c.Request.Context(), &structure); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, structure)
}

func (h *FiscalHandler) GetFeeStructures(c *gin.Context) {
	periodID, err := uuid.Parse(c.Param("period_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID format"})
		return
	}
	structures, err := h.fiscalUseCase.GetFeeStructuresByPeriod(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, structures)
}

func (h *FiscalHandler) DeleteFeeStructure(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fee structure ID"})
		return
	}

	if err := h.fiscalUseCase.DeleteFeeStructure(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fee structure deleted successfully"})
}

func (h *FiscalHandler) GenerateTermFees(c *gin.Context) {
	periodID, err := uuid.Parse(c.Param("period_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID format"})
		return
	}
	generatedCount, err := h.fiscalUseCase.GenerateTermFees(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Fees generated successfully", "count": generatedCount})
}

func (h *FiscalHandler) GetDefaulters(c *gin.Context) {
	records, err := h.fiscalUseCase.ListAllRecords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch fiscal records"})
		return
	}
	// Filter to only PENDING or OVERDUE
	var defaulters []domain.FiscalRecord
	for _, r := range records {
		if r.Status == domain.PaymentStatusPending || r.Status == domain.PaymentStatusOverdue {
			defaulters = append(defaulters, r)
		}
	}
	if defaulters == nil {
		defaulters = []domain.FiscalRecord{}
	}
	c.JSON(http.StatusOK, gin.H{"defaulters": defaulters, "count": len(defaulters)})
}

func (h *FiscalHandler) GenerateInvoice(c *gin.Context) {
	recordID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid record ID"})
		return
	}
	// Fetch the record to build invoice data
	records, err := h.fiscalUseCase.ListAllRecords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch records"})
		return
	}
	var target *domain.FiscalRecord
	for i, r := range records {
		if r.ID == recordID {
			target = &records[i]
			break
		}
	}
	if target == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
		return
	}
	// Return invoice as JSON for the frontend to render as a printable view
	c.JSON(http.StatusOK, gin.H{
		"invoice_number": "INV-" + target.ID.String()[:8],
		"student":        target.Student,
		"category":       target.Category,
		"amount":         target.Amount,
		"breakdown":      target.Breakdown,
		"status":         target.Status,
		"due_date":       target.DueDate,
		"issued_at":      target.CreatedAt,
	})
}

// Budget & Expenses Handlers

func (h *FiscalHandler) CreateBudget(c *gin.Context) {
	var budget domain.Budget
	if err := c.ShouldBindJSON(&budget); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.SetBudget(c.Request.Context(), &budget); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, budget)
}

func (h *FiscalHandler) GetBudgets(c *gin.Context) {
	academicYear := c.Query("academic_year")
	budgets, err := h.fiscalUseCase.GetBudgets(c.Request.Context(), academicYear)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, budgets)
}

func (h *FiscalHandler) RecordExpenditure(c *gin.Context) {
	var exp domain.Expenditure
	if err := c.ShouldBindJSON(&exp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.RecordExpenditure(c.Request.Context(), &exp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, exp)
}

func (h *FiscalHandler) SubmitExpenseClaim(c *gin.Context) {
	var claim domain.ExpenseClaim
	if err := c.ShouldBindJSON(&claim); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.SubmitExpenseClaim(c.Request.Context(), &claim); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, claim)
}

func (h *FiscalHandler) GetExpenseClaims(c *gin.Context) {
	status := c.Query("status")
	claims, err := h.fiscalUseCase.GetExpenseClaims(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, claims)
}

func (h *FiscalHandler) ReviewExpenseClaim(c *gin.Context) {
	claimID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid claim ID"})
		return
	}

	var req struct {
		Approved   bool      `json:"approved"`
		ReviewerID uuid.UUID `json:"reviewer_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.ReviewExpenseClaim(c.Request.Context(), claimID, req.ReviewerID, req.Approved); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Claim reviewed successfully"})
}

func (h *FiscalHandler) GetDebtAgeing(c *gin.Context) {
	report, err := h.fiscalUseCase.GetDebtAgeing(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *FiscalHandler) ApplyScholarship(c *gin.Context) {
	var s domain.Scholarship
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.ApplyScholarship(c.Request.Context(), &s); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *FiscalHandler) GetScholarshipsByStudent(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}
	scholarships, err := h.fiscalUseCase.GetScholarshipsByStudent(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, scholarships)
}

func (h *FiscalHandler) UpdateScholarshipStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	var req struct {
		Status domain.ScholarshipStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.fiscalUseCase.UpdateScholarshipStatus(c.Request.Context(), id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func (h *FiscalHandler) GetYearEndSummary(c *gin.Context) {
	summary, err := h.fiscalUseCase.GetYearEndSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *FiscalHandler) PerformYearEndRollover(c *gin.Context) {
	var req struct {
		NewPeriodID string `json:"new_period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newPeriodUUID, err := uuid.Parse(req.NewPeriodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid new_period_id"})
		return
	}
	result, err := h.fiscalUseCase.PerformYearEndRollover(c.Request.Context(), newPeriodUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FiscalHandler) CreateInstallmentAgreement(c *gin.Context) {
	var req struct {
		StudentID      uuid.UUID                    `json:"student_id" binding:"required"`
		FiscalRecordID uuid.UUID                    `json:"fiscal_record_id" binding:"required"`
		Milestones     []domain.InstallmentMilestone `json:"milestones" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agreement, err := h.fiscalUseCase.CreateInstallmentAgreement(c.Request.Context(), req.StudentID, req.FiscalRecordID, req.Milestones)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, agreement)
}

func (h *FiscalHandler) GetStudentInstallments(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	agreements, err := h.fiscalUseCase.GetStudentInstallments(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, agreements)
}

func (h *FiscalHandler) PayInstallmentMilestone(c *gin.Context) {
	milestoneID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone ID"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.PayInstallmentMilestone(c.Request.Context(), milestoneID, req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Milestone installment payment recorded"})
}

func (h *FiscalHandler) GetInstallmentSettings(c *gin.Context) {
	template, err := h.fiscalUseCase.GetInstallmentPlanTemplate(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, template)
}

func (h *FiscalHandler) SaveInstallmentSettings(c *gin.Context) {
	var req domain.InstallmentPlanTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	saved, err := h.fiscalUseCase.SaveInstallmentPlanTemplate(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, saved)
}

func (h *FiscalHandler) CalculateSiblingDiscount(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID"})
		return
	}

	var customBase *float64
	if baseStr := c.Query("base_tuition"); baseStr != "" {
		if v, err := strconv.ParseFloat(baseStr, 64); err == nil && v > 0 {
			customBase = &v
		}
	}

	discount, err := h.fiscalUseCase.CalculateSiblingDiscount(c.Request.Context(), studentID, customBase)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, discount)
}

func (h *FiscalHandler) SetBaselineTuition(c *gin.Context) {
	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.SetBaselineTuition(c.Request.Context(), req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Baseline tuition updated successfully",
		"amount":  req.Amount,
	})
}

func (h *FiscalHandler) GetExchangeRates(c *gin.Context) {
	rates, err := h.fiscalUseCase.GetExchangeRates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rates)
}

func (h *FiscalHandler) CanteenPOSCharge(c *gin.Context) {
	var req struct {
		StudentID uuid.UUID `json:"student_id" binding:"required"`
		Amount    float64   `json:"amount" binding:"required,gt=0"`
		ItemName  string    `json:"item_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.fiscalUseCase.ProcessCanteenPurchase(c.Request.Context(), req.StudentID, req.Amount, req.ItemName); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "POS charge successful",
		"item_name": req.ItemName,
		"amount":    req.Amount,
	})
}
