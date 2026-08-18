package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type LedgerHandler struct {
	uc *usecase.LedgerUseCase
}

func NewLedgerHandler(rg *gin.RouterGroup, uc *usecase.LedgerUseCase) *LedgerHandler {
	h := &LedgerHandler{uc: uc}

	g := rg.Group("/ledger")
	{
		g.POST("/accounts", h.CreateAccount)
		g.GET("/accounts", h.ListAccounts)
		g.POST("/entries", h.PostEntry)
		g.GET("/accounts/:id/entries", h.GetAccountLedger)
		g.GET("/accounts/:id/balance", h.GetAccountBalance)
		g.GET("/balance-sheet", h.GetBalanceSheet)
	}

	return h
}

func (h *LedgerHandler) CreateAccount(c *gin.Context) {
	var req domain.LedgerAccount
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.CreateAccount(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *LedgerHandler) ListAccounts(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))

	accounts, err := h.uc.ListAccounts(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, accounts)
}

func (h *LedgerHandler) PostEntry(c *gin.Context) {
	var req domain.LedgerEntry
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := uuid.Parse(c.GetString("tenantID"))
	req.TenantID = tenantID

	if err := h.uc.PostEntry(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *LedgerHandler) GetAccountLedger(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account id"})
		return
	}

	entries, err := h.uc.GetAccountLedger(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *LedgerHandler) GetAccountBalance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account id"})
		return
	}

	balance, err := h.uc.GetAccountBalance(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"balance": balance})
}

func (h *LedgerHandler) GetBalanceSheet(c *gin.Context) {
	tenantID, _ := uuid.Parse(c.GetString("tenantID"))

	sheet, err := h.uc.GetBalanceSheet(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sheet)
}
