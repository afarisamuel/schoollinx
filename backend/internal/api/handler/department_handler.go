package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/user/high-school-management/backend/internal/domain"
)

type DepartmentHandler struct {
	useCase domain.DepartmentUseCase
}

func NewDepartmentHandler(r *gin.RouterGroup, uc domain.DepartmentUseCase) {
	h := &DepartmentHandler{useCase: uc}

	departments := r.Group("/departments")
	{
		departments.GET("", h.GetAllDepartments)
		departments.POST("", h.CreateDepartment)
	}
}

func (h *DepartmentHandler) GetAllDepartments(c *gin.Context) {
	depts, err := h.useCase.GetAllDepartments(c.Request.Context())
	if err != nil {
		log.Printf("Error fetching departments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch departments"})
		return
	}

	c.JSON(http.StatusOK, depts)
}

func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var input domain.Department
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := h.useCase.CreateDepartment(c.Request.Context(), &input); err != nil {
		log.Printf("Error creating department: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create department"})
		return
	}

	c.JSON(http.StatusCreated, input)
}
