package handler

import (
	"net/http"

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
		// Teacher: view their own collections today
		g.GET("/my-collections", h.GetMyCollections)
		// Admin: run overdue audit
		g.POST("/run-overdue-audit", h.RunOverdueAudit)
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
