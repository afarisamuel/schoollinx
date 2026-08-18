package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

type SubjectHandler struct {
	useCase *usecase.SubjectUseCase
}

func NewSubjectHandler(r *gin.RouterGroup, uc *usecase.SubjectUseCase) {
	h := &SubjectHandler{useCase: uc}

	g := r.Group("/subjects")
	{
		g.POST("", h.CreateSubject)
		g.GET("", h.GetAllSubjects)
		g.DELETE("/:id", h.DeleteSubject)
	}
}

func (h *SubjectHandler) CreateSubject(c *gin.Context) {
	var req domain.Subject
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.useCase.CreateSubject(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *SubjectHandler) GetAllSubjects(c *gin.Context) {
	subjects, err := h.useCase.GetAllSubjects(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}

func (h *SubjectHandler) DeleteSubject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject ID format"})
		return
	}

	if err := h.useCase.DeleteSubject(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
