package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type LibraryHandler struct {
	libraryUseCase domain.LibraryUseCase
}

func NewLibraryHandler(r *gin.RouterGroup, luc domain.LibraryUseCase) {
	h := &LibraryHandler{libraryUseCase: luc}

	g := r.Group("/library")
	{
		g.GET("/books", h.ListBooks)
		g.POST("/books", h.AddBook)
		g.GET("/active-loans", h.ListActiveLoans)
		g.POST("/loans", h.IssueLoan)
		g.POST("/loans/:id/return", h.ReturnBook)
		g.GET("/students/:id/loans", h.ListStudentLoans)
		g.POST("/audit-overdue", h.AuditOverdue)
	}
}

func (h *LibraryHandler) ListBooks(c *gin.Context) {
	query := c.Query("q")
	books, err := h.libraryUseCase.ListBooks(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, books)
}

func (h *LibraryHandler) AddBook(c *gin.Context) {
	var book domain.LibraryBook
	if err := c.ShouldBindJSON(&book); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.libraryUseCase.AddBook(c.Request.Context(), &book); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, book)
}

func (h *LibraryHandler) ListActiveLoans(c *gin.Context) {
	loans, err := h.libraryUseCase.ListActiveLoans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loans)
}

func (h *LibraryHandler) IssueLoan(c *gin.Context) {
	var req struct {
		Barcode   string    `json:"barcode" binding:"required"`
		StudentID uuid.UUID `json:"student_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loan, err := h.libraryUseCase.IssueLoan(c.Request.Context(), req.Barcode, req.StudentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, loan)
}

func (h *LibraryHandler) ReturnBook(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid loan ID format"})
		return
	}
	if err := h.libraryUseCase.ReturnBook(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "returned"})
}

func (h *LibraryHandler) ListStudentLoans(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID format"})
		return
	}
	loans, err := h.libraryUseCase.ListStudentLoans(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loans)
}

func (h *LibraryHandler) AuditOverdue(c *gin.Context) {
	if err := h.libraryUseCase.CheckOverdueLoans(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "library audit complete"})
}
