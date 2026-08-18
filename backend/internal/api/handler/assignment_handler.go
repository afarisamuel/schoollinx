package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type AssignmentHandler struct {
	assignmentUseCase domain.AssignmentUseCase
}

func NewAssignmentHandler(r *gin.RouterGroup, auc domain.AssignmentUseCase) {
	h := &AssignmentHandler{assignmentUseCase: auc}

	g := r.Group("/assignments")
	{
		g.POST("", h.AssignTeacher)
		g.GET("/class/:class_id", h.GetByClass)
		g.GET("/teacher/:teacher_id", h.GetByTeacher)
		g.DELETE("/:id", h.RemoveAssignment)
	}
}

func (h *AssignmentHandler) AssignTeacher(c *gin.Context) {
	var req struct {
		TeacherID uuid.UUID `json:"teacher_id" binding:"required"`
		ClassID   uuid.UUID `json:"class_id" binding:"required"`
		SubjectID uuid.UUID `json:"subject_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.assignmentUseCase.AssignTeacherToSubject(c.Request.Context(), req.TeacherID, req.ClassID, req.SubjectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Teacher assigned successfully"})
}

func (h *AssignmentHandler) GetByClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("class_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID format"})
		return
	}
	assignments, err := h.assignmentUseCase.GetAssignmentsByClass(c.Request.Context(), classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

func (h *AssignmentHandler) GetByTeacher(c *gin.Context) {
	teacherID, err := uuid.Parse(c.Param("teacher_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}
	assignments, err := h.assignmentUseCase.GetAssignmentsByTeacher(c.Request.Context(), teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

func (h *AssignmentHandler) RemoveAssignment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID format"})
		return
	}
	if err := h.assignmentUseCase.RemoveAssignment(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Assignment removed"})
}
