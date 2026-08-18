package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type CampusOpsHandler struct {
	uc domain.CampusOpsUseCase
}

func NewCampusOpsHandler(r *gin.RouterGroup, usecase domain.CampusOpsUseCase) {
	handler := &CampusOpsHandler{uc: usecase}

	ops := r.Group("/campus-ops")
	{
		// Lost and Found
		ops.POST("/lost-and-found", handler.ReportLostItem)
		ops.PUT("/lost-and-found/:id/claim", handler.ClaimLostItem)
		ops.GET("/lost-and-found", handler.ListLostItems)

		// Visitors
		ops.POST("/visitors", handler.SignInVisitor)
		ops.PUT("/visitors/:id/sign-out", handler.SignOutVisitor)
		ops.GET("/visitors/active", handler.ListActiveVisitors)

		// Disciplinary
		ops.POST("/disciplinary", handler.ReportIncident)
		ops.PUT("/disciplinary/:id/resolve", handler.ResolveIncident)
		ops.GET("/disciplinary/student/:studentId", handler.ListStudentIncidents)
	}
}

func (h *CampusOpsHandler) ReportLostItem(c *gin.Context) {
	var item domain.LostAndFoundItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.uc.ReportLostItem(c.Request.Context(), &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *CampusOpsHandler) ClaimLostItem(c *gin.Context) {
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID format"})
		return
	}

	var req struct {
		ClaimedByID string `json:"claimed_by_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	claimedByID, err := uuid.Parse(req.ClaimedByID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID format"})
		return
	}

	if err := h.uc.ClaimLostItem(c.Request.Context(), itemID, claimedByID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item claimed successfully"})
}

func (h *CampusOpsHandler) ListLostItems(c *gin.Context) {
	items, err := h.uc.ListLostItems(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CampusOpsHandler) SignInVisitor(c *gin.Context) {
	var log domain.VisitorLog
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.uc.SignInVisitor(c.Request.Context(), &log); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, log)
}

func (h *CampusOpsHandler) SignOutVisitor(c *gin.Context) {
	logID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid visitor log ID format"})
		return
	}

	if err := h.uc.SignOutVisitor(c.Request.Context(), logID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Visitor signed out successfully"})
}

func (h *CampusOpsHandler) ListActiveVisitors(c *gin.Context) {
	logs, err := h.uc.ListActiveVisitors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *CampusOpsHandler) ReportIncident(c *gin.Context) {
	var incident domain.DisciplinaryIncident
	if err := c.ShouldBindJSON(&incident); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.uc.ReportIncident(c.Request.Context(), &incident); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, incident)
}

func (h *CampusOpsHandler) ResolveIncident(c *gin.Context) {
	incidentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID format"})
		return
	}

	if err := h.uc.ResolveIncident(c.Request.Context(), incidentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Incident resolved successfully"})
}

func (h *CampusOpsHandler) ListStudentIncidents(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	incidents, err := h.uc.ListStudentIncidents(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, incidents)
}
