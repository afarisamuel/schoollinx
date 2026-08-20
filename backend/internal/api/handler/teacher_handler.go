package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type TeacherHandler struct {
	teacherUseCase domain.TeacherUseCase
}

func NewTeacherHandler(r *gin.RouterGroup, uc domain.TeacherUseCase) {
	handler := &TeacherHandler{
		teacherUseCase: uc,
	}

	api := r.Group("/teachers")
	{
		api.POST("", handler.Create)
		api.GET("/:id", handler.GetByID)
		api.GET("", handler.GetAll)
		api.PUT("/:id", handler.Update)
		api.POST("/:id/signature", handler.UploadSignature)
		api.DELETE("/:id", handler.Delete)

		// Assignments
		api.POST("/assign", handler.AssignToClass)
		api.POST("/bulk-assign", handler.BulkAssignToClass)
		api.DELETE("/unassign/:id", handler.UnassignFromClass)
		api.GET("/:id/assignments", handler.GetAssignments)
		api.GET("/assignments/all", handler.GetAllAssignments)
		api.POST("/:id/activate", handler.Activate)
		api.POST("/:id/reset-password", handler.ResetPassword)
	}
}

func (h *TeacherHandler) Create(c *gin.Context) {
	var teacher domain.Teacher
	if err := c.ShouldBindJSON(&teacher); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}


	err := h.teacherUseCase.CreateTeacher(c.Request.Context(), &teacher)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, teacher)
}

func (h *TeacherHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	teacher, err := h.teacherUseCase.GetTeacherByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) GetAll(c *gin.Context) {
	teachers, err := h.teacherUseCase.GetAllTeachers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

func (h *TeacherHandler) Update(c *gin.Context) {
	var teacher domain.Teacher
	if err := c.ShouldBindJSON(&teacher); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}
	teacher.ID = id

	err = h.teacherUseCase.UpdateTeacher(c.Request.Context(), &teacher)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) UploadSignature(c *gin.Context) {
	teacherID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	file, err := c.FormFile("signature")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
		return
	}

	ext := filepath.Ext(file.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG and PNG files are allowed"})
		return
	}

	uploadDir := "./uploads/signatures/teachers"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	fileName := fmt.Sprintf("%s%s", teacherID.String(), ext)
	filePath := filepath.Join(uploadDir, fileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	host := c.Request.Host
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	fileURL := fmt.Sprintf("%s://%s/uploads/signatures/teachers/%s", scheme, host, fileName)

	// Update the teacher record
	teacher, err := h.teacherUseCase.GetTeacherByID(c.Request.Context(), teacherID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}
	
	teacher.SignatureURL = fileURL
	if err := h.teacherUseCase.UpdateTeacher(c.Request.Context(), teacher); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update teacher signature URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": fileURL})
}

func (h *TeacherHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	err = h.teacherUseCase.DeleteTeacher(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Teacher deleted successfully"})
}

// --- Assignment Endpoints ---

func (h *TeacherHandler) AssignToClass(c *gin.Context) {
	var assignment domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&assignment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.teacherUseCase.AssignToClass(c.Request.Context(), &assignment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, assignment)
}

func (h *TeacherHandler) BulkAssignToClass(c *gin.Context) {
	var assignments []domain.TeacherClassAssignment
	if err := c.ShouldBindJSON(&assignments); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.teacherUseCase.BulkAssignToClass(c.Request.Context(), assignments)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bulk assignments created successfully"})
}

func (h *TeacherHandler) UnassignFromClass(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID format"})
		return
	}

	err = h.teacherUseCase.UnassignFromClass(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unassigned successfully"})
}

func (h *TeacherHandler) GetAssignments(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	assignments, err := h.teacherUseCase.GetAssignments(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assignments)
}

func (h *TeacherHandler) GetAllAssignments(c *gin.Context) {
	assignments, err := h.teacherUseCase.GetAllAssignments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assignments)
}

func (h *TeacherHandler) Activate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	username, password, err := h.teacherUseCase.ActivatePortalAccess(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Portal access activated successfully",
		"username": username,
		"password": password,
	})
}

func (h *TeacherHandler) ResetPassword(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID format"})
		return
	}

	newPassword, err := h.teacherUseCase.ResetPassword(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Password reset successfully. A notification email has been sent.",
		"password": newPassword,
	})
}

