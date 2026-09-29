package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type DailyBillHandler struct {
	uc          domain.DailyBillUseCase
	teacherRepo domain.TeacherRepository
}

func NewDailyBillHandler(r *gin.RouterGroup, uc domain.DailyBillUseCase, teacherRepo domain.TeacherRepository) {
	h := &DailyBillHandler{uc: uc, teacherRepo: teacherRepo}

	g := r.Group("/fiscal/daily-bills")
	{
		// Admin: generate today's bills manually
		g.POST("/generate", h.GenerateBills)
		// Admin: generate today's bills from configured DAILY fee structures
		g.POST("/generate-from-config", h.GenerateBillsFromConfig)
		// Teacher: generate today's bills for a specific route
		g.POST("/generate/route/:id", h.GenerateBillsForRoute)
		// Teacher: generate today's bills for walk-ins
		g.POST("/generate/walk-ins", h.GenerateBillsForWalkIns)
		
		// Admin/Teacher: view pending bills for today
		g.GET("/pending", h.GetPendingBills)
		// Teacher: view pending bills for a specific route
		g.GET("/pending/route/:id", h.GetPendingBillsByRoute)
		// Teacher: view pending bills for walk-ins
		g.GET("/pending/walk-ins", h.GetPendingBillsForWalkIns)

		// Admin/Teacher: view ALL bills for today (with stats)
		g.GET("/today", h.GetTodaysBills)
		// Teacher: collect (pay) a bill
		g.POST("/:id/collect", h.CollectBill)
		// Teacher: batch collect multiple bills
		g.POST("/batch-collect", h.BatchCollect)
		// Teacher: quick-scan collect a student ID / code
		g.POST("/quick-collect", h.QuickCollect)
		// Teacher: view their own collections today
		g.GET("/my-collections", h.GetMyCollections)
		// Shift Handover & Reconciliation
		g.POST("/handover", h.SubmitHandover)
		g.GET("/handovers", h.GetHandovers)
		g.POST("/handover/:id/verify", h.VerifyHandover)
		// Rollover Overdue Bills into Arrears / Debt status
		g.POST("/rollover-overdue", h.RolloverOverdue)
		// Route Performance & Financial Telemetry Analytics
		g.GET("/analytics", h.GetDailyFeeAnalytics)

		// Student Daily Bills
		g.GET("/students/:id", h.GetStudentDailyBills)
	}

	// Admin: toggle teacher fee-collection privilege
	r.PUT("/teachers/:id/privileges", h.TogglePrivilege)
}

// POST /api/fiscal/daily-bills/generate
func (h *DailyBillHandler) GenerateBills(c *gin.Context) {
	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	count, err := h.uc.GenerateDailyBills(c.Request.Context(), req.Amount)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Daily bills generated", "count": count})
}

// POST /api/fiscal/daily-bills/generate-from-config
func (h *DailyBillHandler) GenerateBillsFromConfig(c *gin.Context) {
	var req struct {
		PeriodID string `json:"period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	periodID, err := uuid.Parse(req.PeriodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period_id"})
		return
	}
	count, totalAmount, categories, err := h.uc.GenerateDailyBillsFromConfig(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message":      "Daily bills generated from fee configuration",
		"count":        count,
		"amount":       totalAmount,
		"categories":   categories,
	})
}

// GET /api/fiscal/daily-bills/pending
func (h *DailyBillHandler) GetPendingBills(c *gin.Context) {
	bills, err := h.uc.GetPendingBills(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bills": bills, "count": len(bills)})
}

// GET /api/fiscal/daily-bills/today
func (h *DailyBillHandler) GetTodaysBills(c *gin.Context) {
	bills, err := h.uc.GetTodaysBills(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var paid, pending, total int
	for _, b := range bills {
		total++
		switch b.Status {
		case domain.DailyBillPaid:
			paid++
		case domain.DailyBillPending:
			pending++
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"bills":   bills,
		"total":   total,
		"paid":    paid,
		"pending": pending,
	})
}

// POST /api/fiscal/daily-bills/:id/collect
func (h *DailyBillHandler) CollectBill(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bill ID format"})
		return
	}

	collectorIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	collectorID, ok := collectorIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	if err := h.uc.CollectBill(c.Request.Context(), billID, collectorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bill collected successfully"})
}

// POST /api/fiscal/daily-bills/batch-collect
func (h *DailyBillHandler) BatchCollect(c *gin.Context) {
	collectorIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	collectorID, ok := collectorIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	var req struct {
		BillIDs []string `json:"bill_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedIDs := make([]uuid.UUID, 0, len(req.BillIDs))
	for _, idStr := range req.BillIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			parsedIDs = append(parsedIDs, id)
		}
	}

	count, err := h.uc.BatchCollectBills(c.Request.Context(), parsedIDs, collectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Batch collection completed", "count": count})
}

// POST /api/fiscal/daily-bills/quick-collect
func (h *DailyBillHandler) QuickCollect(c *gin.Context) {
	collectorIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	collectorID, ok := collectorIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	var req struct {
		Identifier string `json:"identifier" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bill, err := h.uc.QuickCollectStudent(c.Request.Context(), req.Identifier, collectorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Daily fee collected successfully", "bill": bill})
}

// GET /api/fiscal/daily-bills/reconciliation
func (h *DailyBillHandler) GetReconciliationSummary(c *gin.Context) {
	summary, err := h.uc.GetReconciliationSummary(c.Request.Context(), time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// GET /api/fiscal/daily-bills/my-collections
func (h *DailyBillHandler) GetMyCollections(c *gin.Context) {
	collectorIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	collectorID, ok := collectorIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	bills, total, err := h.uc.GetMyCollections(c.Request.Context(), collectorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bills": bills, "count": len(bills), "total_collected": total})
}

// POST /api/fiscal/daily-bills/run-overdue-audit
func (h *DailyBillHandler) RunOverdueAudit(c *gin.Context) {
	count, err := h.uc.RunOverdueCheck(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Overdue audit complete", "marked_overdue": count})
}

// PUT /api/teachers/:id/privileges
func (h *DailyBillHandler) TogglePrivilege(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	var req struct {
		CanCollectFees bool `json:"can_collect_fees"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacher, err := h.teacherRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	teacher.CanCollectFees = req.CanCollectFees
	if err := h.teacherRepo.Update(c.Request.Context(), teacher); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	action := "revoked"
	if req.CanCollectFees {
		action = "granted"
	}
	c.JSON(http.StatusOK, gin.H{
		"message":          "Fee collection privilege " + action,
		"can_collect_fees": req.CanCollectFees,
	})
}

// GET /api/fiscal/daily-bills/students/:id
func (h *DailyBillHandler) GetStudentDailyBills(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	bills, err := h.uc.GetStudentDailyBills(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bills": bills, "count": len(bills)})
}

// POST /api/fiscal/daily-bills/generate/route/:id
func (h *DailyBillHandler) GenerateBillsForRoute(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route ID format"})
		return
	}

	var req struct {
		PeriodID string `json:"period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	periodID, err := uuid.Parse(req.PeriodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period_id"})
		return
	}

	count, totalAmount, categories, err := h.uc.GenerateDailyBillsForRoute(c.Request.Context(), routeID, periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message":    "Bills generated for route",
		"count":      count,
		"amount":     totalAmount,
		"categories": categories,
	})
}

// POST /api/fiscal/daily-bills/generate/walk-ins
func (h *DailyBillHandler) GenerateBillsForWalkIns(c *gin.Context) {
	var req struct {
		PeriodID string `json:"period_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	periodID, err := uuid.Parse(req.PeriodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period_id"})
		return
	}

	count, totalAmount, categories, err := h.uc.GenerateDailyBillsForWalkIns(c.Request.Context(), periodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message":    "Bills generated for walk-ins",
		"count":      count,
		"amount":     totalAmount,
		"categories": categories,
	})
}

// GET /api/fiscal/daily-bills/pending/route/:id
func (h *DailyBillHandler) GetPendingBillsByRoute(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route ID format"})
		return
	}

	bills, err := h.uc.GetPendingBillsByRoute(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bills": bills, "count": len(bills)})
}

// GET /api/fiscal/daily-bills/pending/walk-ins
func (h *DailyBillHandler) GetPendingBillsForWalkIns(c *gin.Context) {
	bills, err := h.uc.GetPendingBillsForWalkIns(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bills": bills, "count": len(bills)})
}

// POST /api/fiscal/daily-bills/handover
func (h *DailyBillHandler) SubmitHandover(c *gin.Context) {
	collectorIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	collectorID, ok := collectorIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	var req struct {
		ExpectedCash      float64 `json:"expected_cash"`
		ActualCash        float64 `json:"actual_cash"`
		DenominationsJSON string  `json:"denominations_json"`
		Notes             string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	handover, err := h.uc.SubmitHandover(c.Request.Context(), collectorID, req.ExpectedCash, req.ActualCash, req.DenominationsJSON, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Shift handover submitted successfully", "handover": handover})
}

// GET /api/fiscal/daily-bills/handovers
func (h *DailyBillHandler) GetHandovers(c *gin.Context) {
	dateStr := c.Query("date")
	targetDate := time.Now()
	if dateStr != "" {
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			targetDate = parsed
		}
	}

	handovers, err := h.uc.GetHandovers(c.Request.Context(), targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"handovers": handovers, "count": len(handovers)})
}

// POST /api/fiscal/daily-bills/handover/:id/verify
func (h *DailyBillHandler) VerifyHandover(c *gin.Context) {
	bursarIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	bursarID, ok := bursarIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}

	handoverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid handover ID format"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"` // VERIFIED, REJECTED
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := domain.DailyHandoverStatus(req.Status)
	handover, err := h.uc.VerifyHandover(c.Request.Context(), handoverID, bursarID, status, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Handover record updated successfully", "handover": handover})
}

// POST /api/fiscal/daily-bills/rollover-overdue
func (h *DailyBillHandler) RolloverOverdue(c *gin.Context) {
	var req struct {
		BeforeDate string `json:"before_date"`
	}
	_ = c.ShouldBindJSON(&req)

	beforeDate := time.Now().Truncate(24 * time.Hour)
	if req.BeforeDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.BeforeDate); err == nil {
			beforeDate = parsed
		}
	}

	count, totalAmount, err := h.uc.RolloverOverdueBills(c.Request.Context(), beforeDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":      "Overdue bills audit and rollover completed",
		"count":        count,
		"total_amount": totalAmount,
	})
}

// GET /api/fiscal/daily-bills/analytics
func (h *DailyBillHandler) GetDailyFeeAnalytics(c *gin.Context) {
	dateStr := c.Query("date")
	targetDate := time.Now()
	if dateStr != "" {
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			targetDate = parsed
		}
	}

	analytics, err := h.uc.GetDailyFeeAnalytics(c.Request.Context(), targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, analytics)
}

