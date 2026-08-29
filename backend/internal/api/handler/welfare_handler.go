package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/user/high-school-management/backend/internal/domain"
)

type WelfareHandler struct {
	welfareUseCase domain.WelfareUseCase
}

func NewWelfareHandler(r *gin.RouterGroup, usecase domain.WelfareUseCase) {
	handler := &WelfareHandler{welfareUseCase: usecase}

	welfare := r.Group("/welfare")
	{
		// Health & Sickbay EMR
		welfare.GET("/health/student/:studentId", handler.GetHealth)
		welfare.PUT("/health", handler.UpdateHealth)
		welfare.GET("/sickbay/student/:studentId", handler.GetSickbayVisits)
		welfare.POST("/sickbay/visits", handler.RecordSickbayVisit)

		// Behavior
		welfare.GET("/behavior/student/:studentId", handler.GetBehavior)
		welfare.POST("/behavior", handler.AddBehavior)
		welfare.DELETE("/behavior/:id", handler.DeleteBehavior)
	}
}

func (h *WelfareHandler) GetHealth(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	record, err := h.welfareUseCase.GetStudentHealth(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

func (h *WelfareHandler) UpdateHealth(c *gin.Context) {
	var record domain.HealthRecord
	if err := c.ShouldBindJSON(&record); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.welfareUseCase.UpdateStudentHealth(c.Request.Context(), &record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

func (h *WelfareHandler) GetBehavior(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}

	logs, err := h.welfareUseCase.GetStudentBehavior(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (h *WelfareHandler) AddBehavior(c *gin.Context) {
	var log domain.BehaviorLog
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.welfareUseCase.LogBehaviorEvent(c.Request.Context(), &log); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, log)
}

func (h *WelfareHandler) DeleteBehavior(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
		return
	}

	if err := h.welfareUseCase.RemoveBehaviorEvent(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "log deleted successfully"})
}

func (h *WelfareHandler) GetSickbayVisits(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student ID format"})
		return
	}
	visits, err := h.welfareUseCase.GetStudentSickbayVisits(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, visits)
}

func (h *WelfareHandler) RecordSickbayVisit(c *gin.Context) {
	var visit domain.SickbayVisit
	if err := c.ShouldBindJSON(&visit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.welfareUseCase.RecordSickbayVisit(c.Request.Context(), &visit); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, visit)
}
