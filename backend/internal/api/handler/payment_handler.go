package handler

import (
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type PaymentHandler struct {
	paymentUseCase usecase.PaymentUseCase
}

func NewPaymentHandler(puc usecase.PaymentUseCase) *PaymentHandler {
	return &PaymentHandler{paymentUseCase: puc}
}

func (h *PaymentHandler) InitializePayment(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing tenant context"})
		return
	}

	var req struct {
		FiscalRecordID string  `json:"fiscal_record_id"`
		RecordID       string  `json:"record_id"`
		StudentID      string  `json:"student_id"`
		Amount         float64 `json:"amount"` // Optional, if 0 it will default to full balance
		Email          string  `json:"email"`
		CallbackURL    string  `json:"callback_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	recordIDStr := req.FiscalRecordID
	if recordIDStr == "" {
		recordIDStr = req.RecordID
	}

	var fiscalRecordUUID uuid.UUID
	var err error
	if recordIDStr != "" {
		fiscalRecordUUID, err = uuid.Parse(recordIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid fiscal record ID"})
			return
		}
	}

	var studentUUID uuid.UUID
	if req.StudentID != "" {
		studentUUID, _ = uuid.Parse(req.StudentID)
	}

	var uid uuid.UUID
	if userID, exists := c.Get("userID"); exists && userID != nil {
		if u, ok := userID.(uuid.UUID); ok {
			uid = u
		}
	}

	callbackURL := req.CallbackURL
	if callbackURL == "" {
		origin := c.GetHeader("Origin")
		if origin != "" {
			callbackURL = origin + "/parents/finance"
		}
	}

	authURL, err := h.paymentUseCase.InitializePayment(c.Request.Context(), tenantID.(uuid.UUID).String(), uid, fiscalRecordUUID, studentUUID, req.Email, req.Amount, callbackURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authorization_url": authURL,
	})
}

func (h *PaymentHandler) InitializeWalletTopUp(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing tenant context"})
		return
	}

	var req struct {
		StudentID   string  `json:"student_id" binding:"required"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		Email       string  `json:"email"`
		CallbackURL string  `json:"callback_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id and amount are required"})
		return
	}

	studentUUID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	callbackURL := req.CallbackURL
	if callbackURL == "" {
		origin := c.GetHeader("Origin")
		if origin != "" {
			callbackURL = origin + "/parents?tab=billing"
		}
	}

	authURL, err := h.paymentUseCase.InitializeWalletTopUp(c.Request.Context(), tenantID.(uuid.UUID).String(), studentUUID, req.Email, req.Amount, callbackURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authorization_url": authURL,
	})
}

func (h *PaymentHandler) VerifyPayment(c *gin.Context) {
	var tenantID string
	if tID, exists := c.Get("tenantID"); exists && tID != nil {
		if u, ok := tID.(uuid.UUID); ok {
			tenantID = u.String()
		}
	}

	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing transaction reference"})
		return
	}

	tx, err := h.paymentUseCase.VerifyPayment(c.Request.Context(), tenantID, reference)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Payment verified successfully",
		"data":    tx,
	})
}

// HandleWebhook receives events from Paystack
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	signature := c.GetHeader("x-paystack-signature")
	if signature == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
		return
	}

	err = h.paymentUseCase.HandlePaystackWebhook(c.Request.Context(), payload, signature)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *PaymentHandler) GetPublicInvoiceDetails(c *gin.Context) {
	idParam := c.Param("id")
	invoiceID, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID format"})
		return
	}

	invoice, student, tenant, err := h.paymentUseCase.GetPublicInvoice(c.Request.Context(), invoiceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found or expired"})
		return
	}

	studentName := ""
	academicYear := ""
	if student != nil {
		studentName = fmt.Sprintf("%s %s", student.FirstName, student.LastName)
		academicYear = student.AcademicYear
	}

	schoolName := "SchoolLinx Academy"
	subdomain := ""
	if tenant != nil {
		schoolName = tenant.Name
		subdomain = tenant.Subdomain
	}

	c.JSON(http.StatusOK, gin.H{
		"invoice_id":    invoice.ID,
		"category":      invoice.Category,
		"description":   invoice.Description,
		"amount":        invoice.Amount,
		"amount_paid":   invoice.AmountPaid,
		"balance":       invoice.Amount - invoice.AmountPaid,
		"due_date":      invoice.DueDate,
		"status":        invoice.Status,
		"term_name":     invoice.TermName,
		"academic_year": academicYear,
		"student_name":  studentName,
		"school_name":   schoolName,
		"subdomain":     subdomain,
	})
}

func (h *PaymentHandler) InitializePublicInvoicePayment(c *gin.Context) {
	var req struct {
		InvoiceID   string  `json:"invoice_id" binding:"required"`
		Email       string  `json:"email"`
		Amount      float64 `json:"amount"`
		CallbackURL string  `json:"callback_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invoice_id is required"})
		return
	}

	invoiceUUID, err := uuid.Parse(req.InvoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID format"})
		return
	}

	invoice, _, tenant, err := h.paymentUseCase.GetPublicInvoice(c.Request.Context(), invoiceUUID)
	if err != nil || invoice == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	tenantID := ""
	if tenant != nil {
		tenantID = tenant.ID.String()
	} else {
		if tID, has := middleware.GetTenantIDFromContext(c.Request.Context()); has && tID != uuid.Nil {
			tenantID = tID.String()
		}
	}

	callbackURL := req.CallbackURL
	if callbackURL == "" {
		origin := c.GetHeader("Origin")
		if origin != "" {
			callbackURL = fmt.Sprintf("%s/pay/%s?verified=true", origin, req.InvoiceID)
		}
	}

	email := req.Email
	if email == "" {
		email = "parent@schoollinx.com"
	}

	authURL, err := h.paymentUseCase.InitializePayment(c.Request.Context(), tenantID, uuid.Nil, invoice.ID, invoice.StudentID, email, req.Amount, callbackURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authorization_url": authURL,
	})
}
